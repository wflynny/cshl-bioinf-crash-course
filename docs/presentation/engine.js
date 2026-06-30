/* =============================================================================
   engine.js — the drawing + navigation engine.

   You will rarely need to touch this file. To change what the slides SAY or
   SHOW, edit content.js. To change how it LOOKS, edit styles.css.

   What lives here:
     1. Molecule vocabulary  — block defs, widths, and column/molecule builders
     2. Renderers            — turn a molecule spec into HTML
     3. Navigation           — next / back / arrow keys / progress dots

   How a molecule is drawn (the "column model"):
     A molecule is a left-to-right list of COLUMNS. Each column = c(width, top, bot):
       - both top AND bot present  -> double-stranded (draws a base-pairing rung)
       - only one present          -> single-stranded region or an overhang
     Each block's `kind` maps to a `.k-<kind>` colour class in styles.css.
============================================================================= */

/* ---- 1. molecule vocabulary -------------------------------------------------
   Column widths in px. Keep poly==poly so poly(A)/poly(dT) line up, and
   t==cdna so the transcript sits over its copy in the hybrid steps. */
var W = { read1:72, read2:72, bc:58, umi:44, poly:44, t:50, cdna:50,
          tso:44, p5:38, i5:50, i7:50, p7:38, oh:18, lp:54, rp:54, probe:108, sb:50, spc:14, cap:44 };

/* Block definitions. label = text shown; seq = shown in monospace instead.
   To add a new part: add a block here AND a matching `.k-<kind>` rule in
   styles.css (e.g. a new `LP={kind:"lp",label:"LP"}` + `.k-lp{background:...}`). */
var R1  = {kind:"handle", label:"Read 1"},  R2 = {kind:"handle", label:"Read 2"},
    BC  = {kind:"bc",     label:"barcode"}, UM = {kind:"umi",    label:"UMI"},
    PA  = {kind:"poly",   seq:"AAAA"},       PT = {kind:"polyt",  seq:"TTTT"},
    MOL = {kind:"mol"},                      CD = {kind:"cdna"},
    TSO = {kind:"tso",    label:"TSO"},
    P5  = {kind:"p5",     label:"P5"},  I5 = {kind:"idx", label:"i5"},
    I7  = {kind:"idx",    label:"i7"},  P7 = {kind:"p7",  label:"P7"},
    OA  = {kind:"oh",     seq:"A"},     OT = {kind:"oh",  seq:"T"},
    LP  = {kind:"lp",     label:"probe L"}, RP = {kind:"rp", label:"probe R"},   // Flex probe halves
    PROBE = {kind:"probe", label:"probe"}, SB = {kind:"sbc", label:"sample"}, SPC = {kind:"spc"}, CS = {kind:"cap", label:"CS1"};  // ligated probe / sample bc / spacer / capture seq

/* Strand end-label pairs ["leftLabel","rightLabel"]. Top strand runs 3'->5'
   left to right; the bottom (copy) strand is antiparallel, so 5'->3'. */
var DS5 = ["3′","5′"], DS3 = ["5′","3′"];

/* Column + common column-group builders. */
function c(w, top, bot){ var o = {w:w}; if(top) o.top = top; if(bot) o.bot = bot; return o; }
function handlesBot(){ return [c(W.read1,0,R1), c(W.bc,0,BC), c(W.umi,0,UM)]; }   // ss oligo
function handlesDs(){  return [c(W.read1,R1,R1), c(W.bc,BC,BC), c(W.umi,UM,UM)]; } // ds handles

/* The full sequencer-ready 10x library, left to right. */
function libCols(){
  return [ c(W.p5,P5,P5), c(W.i5,I5,I5), c(W.read1,R1,R1), c(W.bc,BC,BC), c(W.umi,UM,UM),
           c(W.poly,PA,PT), c(W.t,MOL,MOL), c(W.read2,R2,R2), c(W.i7,I7,I7), c(W.p7,P7,P7) ];
}
/* A library molecule with one or more priming arrows (used by the sequencing
   steps). Column indices for arrows/brackets: 0 P5,1 i5,2 Read1,3 barcode,
   4 UMI,5 poly,6 insert,7 Read2,8 i7,9 P7. */
function lib(arrow){ return { topEnds:DS5, botEnds:DS3, cols:libCols(), arrow:arrow }; }

/* Flex library. The ligated probe carries: probe seq -- spacer -- sample barcode
   -- spacer -- partial capture sequence (CS1). The gel bead's complementary
   capture sequence binds CS1 and adds the cell (droplet) barcode + UMI. Indices:
   0 P5,1 i5,2 Read1,3 droplet-bc,4 UMI,5 capture-seq,6 spacer,7 sample-bc,8 spacer,
   9 probe,10 Read2,11 i7,12 P7. */
function libFlexCols(){
  return [ c(W.p5,P5,P5), c(W.i5,I5,I5), c(W.read1,R1,R1), c(W.bc,BC,BC), c(W.umi,UM,UM),
           c(W.cap,CS,CS), c(W.spc,SPC,SPC), c(W.sb,SB,SB), c(W.spc,SPC,SPC), c(W.probe,PROBE,PROBE),
           c(W.read2,R2,R2), c(W.i7,I7,I7), c(W.p7,P7,P7) ];
}
function libFlex(arrow){ return { topEnds:DS5, botEnds:DS3, cols:libFlexCols(), arrow:arrow }; }

/* ---- 2. renderers (molecule spec -> HTML) ---------------------------------- */
function cell(b, w, gray, hatch){
  if(!b) return '<i class="sp" style="width:'+w+'px"></i>';            // single-stranded gap
  var inner = b.seq ? '<span class="seq">'+b.seq+'</span>' : (b.label || '');
  return '<i class="blk k-'+b.kind+(gray?' gray':'')+(hatch?' hatch':'')+'" style="width:'+w+'px">'+inner+'</i>';
}
function xs(cols){ var x=[], a=0; cols.forEach(function(col){ x.push(a); a+=col.w; }); x.total=a; return x; }
function spanW(cols, f, t){ var w=0; for(var k=f;k<=t;k++) w+=cols[k].w; return w; }

/* priming arrow(s) above the molecule, over a column span, pointing dir. */
function arrowRow(cols, arrows){
  var x = xs(cols), h = '<div class="arow" style="width:'+x.total+'px">';
  arrows.forEach(function(a){
    h += '<div class="ar" style="left:'+x[a.from]+'px;width:'+spanW(cols,a.from,a.to)+'px">'
       + '<span class="ah ah-'+a.dir+'"></span><span class="al">'+a.label+'</span></div>';
  });
  return h + '</div>';
}
/* labelled brackets above the molecule (used on the "reads" cartoon). */
function annotTopRow(cols, annot){
  var x = xs(cols), h = '<div class="annotT" style="width:'+x.total+'px">';
  annot.forEach(function(a){
    h += '<div class="brkT" style="left:'+x[a.from]+'px;width:'+spanW(cols,a.from,a.to)+'px">'
       + '<span class="t">'+a.label+'</span></div>';
  });
  return h + '</div>';
}
/* 3'/5' labels, anchored to each strand's first/last real block and centred
   vertically on that strand. headH offsets for any arrow / top-bracket rows. */
function endLabels(cols, x, te, be, headH){
  var html = '', tops = cols.map(function(c){return !!c.top;}), bots = cols.map(function(c){return !!c.bot;});
  function first(a){ for(var i=0;i<a.length;i++) if(a[i]) return i; return -1; }
  function last(a){ for(var i=a.length-1;i>=0;i--) if(a[i]) return i; return -1; }
  function pair(present, labels, y){
    var f = first(present), l = last(present);
    if(f < 0) return '';
    var lx = x[f], rx = x[l] + cols[l].w;
    return '<span class="e" style="left:'+(lx-13)+'px;top:'+y+'px">'+labels[0]+'</span>'
         + '<span class="e" style="left:'+(rx+3)+'px;top:'+y+'px">'+labels[1]+'</span>';
  }
  if(te) html += pair(tops, te, headH + 16);   // top strand row centre
  if(be) html += pair(bots, be, headH + 55);   // bottom strand row centre
  return html;
}

/* one molecule -> HTML */
function molOne(m){
  var cols = m.cols, gray = m.gray, hatch = m.hatch, x = xs(cols);
  var hasBot = cols.some(function(c){ return c.bot; });
  var headH  = (m.arrow ? 22 : 0) + (m.annotTop ? 26 : 0);
  var html = '';
  if(m.arrow)    html += arrowRow(cols, m.arrow);
  if(m.annotTop) html += annotTopRow(cols, m.annotTop);
  html += '<div class="molbar">' + cols.map(function(col){ return cell(col.top, col.w, gray, hatch); }).join('') + '</div>';
  if(hasBot){
    html += '<div class="rungs">' + cols.map(function(col){
              return '<i class="sp" style="width:'+col.w+'px">' + ((col.top && col.bot) ? '<i class="rung"></i>' : '') + '</i>';
            }).join('') + '</div>';
    html += '<div class="molbar">' + cols.map(function(col){ return cell(col.bot, col.w, gray); }).join('') + '</div>';
  }
  html += endLabels(cols, x, m.topEnds, hasBot ? m.botEnds : 0, headH);
  var tag = m.tag ? '<div class="ftag'+(gray?' g':'')+'">'+m.tag+'</div>' : '';
  return '<div class="molwrap"><div class="bars" style="width:'+x.total+'px">'+html+'</div>'+tag+'</div>';
}

/* a step's `mol` -> HTML. One molecule, or {inline, mols:[...]} for several. */
function molHTML(mol){
  var list = mol.mols || [mol];
  return '<div class="molset'+(mol.inline?' inline':'')+'">' + list.map(molOne).join('') + '</div>';
}

/* small coloured bar — used by the dedup panel in content.js */
function mini(w, bg){ return '<i class="mini" style="width:'+w+'px;background:'+bg+'"></i>'; }

/* ---- 3. navigation ---------------------------------------------------------- */
function $(s){ return document.querySelector(s); }
var STEP = 0, molEl, dots, STEPS, MODE = "3p";   // STEPS points at the active step set
var KICKERS = { "3p":"Tracking one molecule · 10x 3′ gene expression",
                "flex":"Tracking one molecule · 10x Flex (probe-based)" };

function render(){
  var st = STEPS[STEP];                               // STEPS + SPECIAL come from content.js
  $("#cur").textContent = STEP + 1;
  $("#title").textContent = st.title;
  $("#c").innerHTML = st.c || "";
  $("#d").innerHTML = st.d || "";
  var inner = st.special ? '<div class="molset">'+SPECIAL[st.special]()+'</div>' : molHTML(st.mol);
  if(st.compartment) inner = '<div class="compartment cmp-'+st.compartment+'"><span class="clabel">'+st.compartment+'</span>'+inner+'</div>';
  molEl.innerHTML = inner;
  for(var k=0;k<dots.children.length;k++) dots.children[k].className = "dot" + (k===STEP ? " on" : "");
  $("#prev").disabled = STEP === 0;
  $("#next").disabled = STEP === STEPS.length - 1;
}
function go(k){ STEP = Math.max(0, Math.min(STEPS.length - 1, k)); render(); }

function buildDots(){
  dots.innerHTML = "";
  STEPS.forEach(function(_, k){
    var b = document.createElement("button");
    b.className = "dot"; b.onclick = function(){ go(k); };
    dots.appendChild(b);
  });
  $("#tot").textContent = STEPS.length;
}

/* Swap the active step set: "3p" (3' GEX, default) <-> "flex" (probe-based).
   STEPS_3P and STEPS_FLEX both come from content.js. */
function setMode(m){
  MODE = (m === "flex") ? "flex" : "3p";
  STEPS = (MODE === "flex") ? STEPS_FLEX : STEPS_3P;
  if($("#kicker")) $("#kicker").textContent = KICKERS[MODE];
  if($("#mode-3p"))   $("#mode-3p").className   = "mode" + (MODE === "3p"   ? " on" : "");
  if($("#mode-flex")) $("#mode-flex").className = "mode" + (MODE === "flex" ? " on" : "");
  buildDots();
  STEP = Math.min(STEP, STEPS.length - 1);
  render();
}

function init(){
  molEl = $("#mol"); dots = $("#dots");
  $("#next").onclick = function(){ go(STEP + 1); };
  $("#prev").onclick = function(){ go(STEP - 1); };
  if($("#mode-3p"))   $("#mode-3p").onclick   = function(){ STEP = 0; setMode("3p"); };
  if($("#mode-flex")) $("#mode-flex").onclick = function(){ STEP = 0; setMode("flex"); };
  addEventListener("keydown", function(e){
    if(e.key === "ArrowRight" || e.key === " "){ e.preventDefault(); go(STEP + 1); }
    if(e.key === "ArrowLeft"){ e.preventDefault(); go(STEP - 1); }
  });
  setMode("3p");   // default: 3' GEX; builds dots + first render
}
document.addEventListener("DOMContentLoaded", init);
