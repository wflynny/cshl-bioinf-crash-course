/* =============================================================================
   content.js — THE FILE TO EDIT.

   Three things live here:
     1. CONTENT  — the editable strings/numbers (sequences, gene, matrix...).
                   Change a value here and it updates everywhere it's shown.
     2. STEPS    — the ordered list of slides.
     3. SPECIAL  — the four custom data panels (reads / extract / dedup / measure).

   ---- STEP schema -----------------------------------------------------------
   Each STEP is an object:
     { title:"...", c:"caption (HTML ok)", d:"detail line (HTML ok)",
       AND one of:
         mol: <MOLECULE>      // a molecule diagram (most steps), or
         special:"name"       // a custom panel defined in SPECIAL below
     }

   A MOLECULE is either a single molecule:
     { cols:[ ... ], topEnds, botEnds, arrow?, annotTop? }
   or several shown together:
     { inline:true, mols:[ <MOLECULE>, <MOLECULE>, ... ] }   // side by side
     { mols:[ <MOLECULE>, ... ] }                            // stacked

   COLUMNS are built with c(width, topBlock, bottomBlock) from engine.js:
       c(W.bc, BC, BC)   -> double-stranded barcode column
       c(W.t,  MOL, 0)   -> single-stranded transcript (no bottom strand)
       c(W.oh, 0,  OA)   -> a one-base A overhang on the bottom strand only
   Available blocks: R1 R2 BC UM PA PT MOL CD TSO P5 I5 I7 P7 OA OT  (see engine.js)
   Available widths: W.read1 W.read2 W.bc W.umi W.poly W.t W.cdna W.tso W.p5 W.i5 W.i7 W.p7 W.oh

   topEnds / botEnds = ["leftLabel","rightLabel"], e.g. DS5 and DS3.
   arrow / annotTop / read brackets address COLUMNS by index (0 = leftmost).
   To add a step: copy a step object, drop it into STEPS where you want it.
============================================================================= */

var CONTENT = {
  readName: "LH00341:273:23KNN2LT3:1:1101:13035:1061",   // FASTQ read header (without the read suffix)
  droplet:  "CACGATTAGATAGTGA",   // 16 bp droplet (10x) barcode
  dropletShort: "…GTGA",          // short form shown in the matrix / sentence
  umis:     ["TAACCTGTGTCT", "GAAGTTAGGGCA"],  // 12 bp UMIs; [0] is the molecule we track
  i7: "ATGACGTCGC",               // 10 bp i7 sample index
  i5: "ATCCTGACCT",               // 10 bp i5 sample index
  r1qual: "JFJJJJJJJJJJJJJJJJJJJJJJJJJJ",       // Read 1 quality line (28 chars)
  r2seq:  "CCCTCAACACGGATATCAGCATCCTGTCCTTGCAGGCTTCTGAATTCCCTTCTGAGTTAATGTCAAATGACAGCAAAGCACTGTGTGGCT",
  probeSeq: "CCCTCAACACGGATATCAGCATCCTGTCCTTGCAGGCTTCTGAATTCCCT",   // ~50 bp ligated Flex probe (placeholder)
  r2spacer: "ACGTACGTACGTAC",   // 14 bp spacer between probe and sample barcode in R2
  sampleBC: "AGGTTCAC",          // 8 bp Flex probe (sample) barcode, ~position 65 of R2
  gene:   "Actb",                 // gene the fragment aligns to
  locus:  "chr5:142,903,115–142,906,754",       // alignment coordinates (placeholder — set to your build)

  // deduplication panel: each species is one (droplet, UMI, gene) and its PCR copy count.
  // insert = width in px (use length to imply different genes); umi = a colour.
  dedup: {
    dropletColor: "var(--bc)",
    species: [
      { umi:"#5f86c4", insert:54, copies:3 },   // gene A, UMI 1
      { umi:"#caa24a", insert:54, copies:2 },   // gene A, UMI 2  (same gene, different molecule)
      { umi:"#9a6cc9", insert:82, copies:4 }    // gene B (longer insert)
    ]
  },

  // counts matrix: rows = droplets, columns = genes. hit = [rowIndex, colIndex] to highlight.
  matrix: {
    genes: ["Actb", "Gapdh", "Cd3e", "Pecam1"],
    rows: [ { bc:"…GTGA", counts:[2,1,0,0] },
            { bc:"…ACGT", counts:[0,3,1,0] },
            { bc:"…TTGC", counts:[1,0,0,2] } ],
    hit: [0, 0]
  }
};

var STEPS_3P = [
 { title:"One mRNA, in one cell",
   c:"This is what we want to count: a single transcript from one gene.",
   d:"Single-stranded RNA, drawn tail-first — the <b>poly(A) tail</b> on the left is the only thing we can grab.",
   mol:{ topEnds:DS5, cols:[ c(W.poly,PA), c(W.t,MOL), c(W.t,MOL), c(W.t,MOL) ] } },

 { title:"Captured on the bead",
   c:"The bead's poly(dT) base-pairs the poly(A) tail.",
   d:"Only the tail is paired; the transcript dangles. The primer also carries a <b>droplet barcode</b> (which droplet) and a <b>UMI</b> (which molecule).",
   mol:{ topEnds:DS5, botEnds:DS3, cols: handlesBot().concat([ c(W.poly,PA,PT), c(W.t,MOL), c(W.t,MOL), c(W.t,MOL) ]) } },

 { title:"Reverse transcription",
   c:"RT copies the RNA into a cDNA strand.",
   d:"An <b>RNA : cDNA hybrid</b> — RNA template on top, the new DNA copy beneath, antiparallel. Barcode and UMI are now welded to a copy of your transcript.",
   mol:{ topEnds:DS5, botEnds:DS3, cols: handlesBot().concat([ c(W.poly,PA,PT), c(W.t,MOL,CD), c(W.t,MOL,CD), c(W.t,MOL,CD) ]) } },

 { title:"Template switch",
   c:"At the far (5′) end, C's are added and a template-switch oligo is copied on.",
   d:"The copy now has a handle at <b>both</b> ends, so it can be amplified by PCR.",
   mol:{ topEnds:DS5, botEnds:DS3, cols: handlesBot().concat([ c(W.poly,PA,PT), c(W.t,MOL,CD), c(W.t,MOL,CD), c(W.t,MOL,CD), c(W.tso,0,TSO) ]) } },

 { title:"Second strand, then amplify",
   c:"The RNA is removed, the second strand is made, and it's PCR-amplified.",
   d:"Now <b>double-stranded DNA</b> — many identical copies, every one carrying the same barcode and the same UMI.",
   mol:{ topEnds:DS5, botEnds:DS3, cols: handlesDs().concat([ c(W.poly,PA,PT), c(W.t,MOL,MOL), c(W.t,MOL,MOL), c(W.t,MOL,MOL), c(W.tso,TSO,TSO) ]) } },

 { title:"Fragmentation cuts it into pieces",
   c:"The long molecule is cut into separate fragments.",
   d:"Each cut makes its own double-stranded piece. They're all still here for now.",
   mol:{ inline:true, mols:[
     { topEnds:DS5, botEnds:DS3, tag:"3′ piece", cols: handlesDs().concat([ c(W.poly,PA,PT), c(W.t,MOL,MOL) ]) },
     { topEnds:DS5, botEnds:DS3, tag:"internal", cols:[ c(W.t,MOL,MOL) ] },
     { topEnds:DS5, botEnds:DS3, tag:"5′ piece", cols:[ c(W.t,MOL,MOL), c(W.tso,TSO,TSO) ] }
   ] } },

 { title:"Only the 3′ piece is kept",
   c:"The piece still attached to the barcode survives; the rest is discarded.",
   d:"The internal and 5′ pieces carry transcript but <b>no barcode</b> — and no Read 1 handle to take a P5 end in the final PCR — so they drop out.",
   mol:{ inline:true, mols:[
     { topEnds:DS5, botEnds:DS3, tag:"kept", cols: handlesDs().concat([ c(W.poly,PA,PT), c(W.t,MOL,MOL) ]) },
     { topEnds:DS5, botEnds:DS3, gray:true, tag:"discarded", cols:[ c(W.t,MOL,MOL) ] },
     { topEnds:DS5, botEnds:DS3, gray:true, tag:"discarded", cols:[ c(W.t,MOL,MOL), c(W.tso,TSO,TSO) ] }
   ] } },

 { title:"Read 2 adapter ligated by an A/T overhang",
   c:"The kept piece gets a single 3′ A; the adapter has a matching T overhang.",
   d:"<b>A-tailing</b> adds one A to the insert's 3′ end (a one-base overhang on its strand). The adapter's complementary <b>T overhang</b> base-pairs it, and ligase joins them.",
   mol:{ inline:true, mols:[
     { topEnds:DS5, botEnds:DS3, tag:"insert · 3′ A overhang", cols: handlesDs().concat([ c(W.poly,PA,PT), c(W.t,MOL,MOL), c(W.oh,0,OA) ]) },
     { topEnds:DS3, botEnds:DS5, tag:"Read 2 adapter · T overhang", cols:[ c(W.oh,OT,0), c(W.read2,R2,R2) ] }
   ] } },

 { title:"Index PCR adds the outer adapters",
   c:"P5 / i5 join the barcode side; i7 / P7 join the Read 2 side.",
   d:"<b>P5 / P7</b> grab the flow cell. <b>i5 / i7</b> are shared by every fragment in this library — really library barcodes, added at each end by the index-PCR primers.",
   mol:{ inline:true, mols:[
     { topEnds:DS5, botEnds:DS3, tag:"P5 / i5 primer", cols:[ c(W.p5,P5,P5), c(W.i5,I5,I5) ] },
     { topEnds:DS5, botEnds:DS3, cols: handlesDs().concat([ c(W.poly,PA,PT), c(W.t,MOL,MOL), c(W.read2,R2,R2) ]) },
     { topEnds:DS5, botEnds:DS3, tag:"i7 / P7 primer", cols:[ c(W.i7,I7,I7), c(W.p7,P7,P7) ] }
   ] } },

 { title:"Sequencing — Read 1, then Index 1",
   c:"Each read is primed off a handle and extends one way (arrow).",
   d:"<b>Read 1</b> reads the barcode + UMI (28 bp). <b>Index 1</b> reads the i7 library barcode.",
   mol:{ mols:[ lib([{from:2,to:4,dir:"right",label:"Read 1 · 28 bp"}]),
                lib([{from:7,to:8,dir:"right",label:"Index 1 · i7 · 10 bp"}]) ] } },

 { title:"Sequencing — Index 2, then Read 2",
   c:"The flow cell turns the fragment around to read the other side.",
   d:"<b>Index 2</b> reads the i5 library barcode. <b>Read 2</b> primes off the Read 2 handle and reads back into the transcript (90 bp).",
   mol:{ mols:[ lib([{from:1,to:2,dir:"left",label:"Index 2 · i5 · 10 bp"}]),
                lib([{from:6,to:7,dir:"left",label:"Read 2 · 90 bp"}]) ] } },

 { title:"What the sequencer writes: FASTQ files", special:"filenames",
   c:"Sequencing is done — the instrument writes the reads to <b>FASTQ</b> files, one per read, named by a fixed convention.",
   d:"Our fragment's barcode + UMI end is written to the <b>R1</b> file and its transcript end to the <b>R2</b> file. The file name encodes the sample, lane, and read — learn it once and you can read any 10x run's files at a glance." },

 { title:"The reads, and where each piece lands", special:"reads",
   c:"Only some regions are actually base-called. Each lands in a specific read.",
   d:"R1 holds the barcode (green) and UMI (orange); the i7 / i5 indexes (gold) sit in the read header; R2 holds the transcript (pink)." },

 { title:"Extract the pieces, align the fragment", special:"extract",
   c:"From the reads we pull three things — and turn the fragment into a gene.",
   d:"Barcode and UMI are read off directly. The transcript fragment is aligned to the genome, which turns a string of bases into a <b>gene name + location</b>. The molecule is now a triple: <b>(droplet, UMI, gene)</b>." },

 { title:"…done for many molecules, then deduplicated", special:"dedup",
   c:"Across millions of molecules, copies of the same (droplet, UMI, gene) collapse to one.",
   d:"Two here share the <b>gene</b> but differ by <b>UMI</b> (colour) — two real molecules. The third is a different gene (longer insert). PCR copies vanish; real molecules remain." },

 { title:"…and it becomes the counts matrix", special:"measure",
   c:"Two distinct UMIs of " + CONTENT.gene + " in this droplet means a count of 2.",
   d:"Rows = droplets, columns = genes. Each deduplicated molecule adds 1 to its droplet × gene cell — the matrix you load in Scanpy or Seurat." },
];

/* ===========================================================================
   STEPS_FLEX — the probe-based (10x Flex / Fixed RNA Profiling) version.
   Same destination (a counts matrix), but: fixed cells, a ligated probe pair
   instead of poly(A) capture, and a probe-set lookup instead of genome
   alignment. Middle/end steps mirror the 3' deck. Molecule drawings are a
   first pass — refine the probe/ligation graphics as you like.
=========================================================================== */
var STEPS_FLEX = [
 { title:"One mRNA, in a fixed cell",
   c:"Flex starts from <b>fixed, permeabilized</b> cells -- the RNA is held in place, not floating free.",
   d:"Same goal: count one transcript. But we won't grab its poly(A) tail; we'll target it with probes.",
   mol:{ topEnds:DS5, hatch:true, cols:[ c(W.poly,PA), c(W.t,MOL), c(W.t,MOL), c(W.t,MOL) ] } },

 { title:"A probe pair finds its target",
   c:"For each gene in the panel, a pair of probes hybridizes to two <b>adjacent</b> sites on the transcript.",
   d:"The <b>left</b> and <b>right</b> half-probes base-pair the transcript next to each other. The probe also carries a <b>sample barcode</b> and a <b>poly(A)</b> capture tail (dangling off to the side).",
   mol:{ topEnds:DS5, botEnds:DS3, hatch:true, cols:[
     c(W.t,MOL), c(W.lp,MOL,LP), c(W.rp,MOL,RP),
     c(W.spc,0,SPC), c(W.sb,0,SB), c(W.spc,0,SPC), c(W.poly,0,PA) ] } },

 { title:"Ligation joins the halves into one probe",
   c:"Only if both halves bound correctly does a ligase join them into a single probe.",
   d:"The two halves become <b>one probe sequence</b>. That ligation junction is the specificity check -- mis-hybridized halves don't join and wash away.",
   mol:{ topEnds:DS5, botEnds:DS3, hatch:true, cols:[
     c(W.t,MOL), c(W.probe,MOL,PROBE),
     c(W.spc,0,SPC), c(W.sb,0,SB), c(W.spc,0,SPC), c(W.poly,0,PA) ] } },

 { title:"Captured on the bead",
   c:"In the droplet, the bead's poly(dT) captures the probe's poly(A); the primer adds a droplet barcode + UMI.",
   d:"The molecule now carries <b>two</b> barcodes: the <b>sample barcode</b> (from the probe -- which sample) and the <b>droplet barcode</b> + <b>UMI</b> (from the bead -- which cell, which molecule).",
   mol:{ topEnds:DS5, botEnds:DS3, cols: handlesBot().concat([
     c(W.poly,PA,PT), c(W.spc,SPC,0), c(W.sb,SB,0), c(W.spc,SPC,0), c(W.probe,PROBE,0) ]) } },

 { title:"Barcode + UMI welded on",
   c:"After extension it's double-stranded -- every copy carries the same sample barcode, droplet barcode, and UMI.",
   d:"From here, Flex and 3′ are nearly identical.",
   mol:{ topEnds:DS5, botEnds:DS3, cols: handlesDs().concat([
     c(W.poly,PA,PT), c(W.spc,SPC,SPC), c(W.sb,SB,SB), c(W.spc,SPC,SPC), c(W.probe,PROBE,PROBE) ]) } },

 { title:"Amplified into a library",
   c:"PCR amplifies it; index primers add the outer adapters.",
   d:"<b>P5 / P7</b> grab the flow cell; <b>i5 / i7</b> are the library indexes. No fragmentation or template switch -- the probe is a fixed length.",
   mol:{ inline:true, mols:[
     { topEnds:DS5, botEnds:DS3, tag:"P5 / i5", cols:[ c(W.p5,P5,P5), c(W.i5,I5,I5) ] },
     { topEnds:DS5, botEnds:DS3, cols: handlesDs().concat([
        c(W.poly,PA,PT), c(W.spc,SPC,SPC), c(W.sb,SB,SB), c(W.spc,SPC,SPC), c(W.probe,PROBE,PROBE), c(W.read2,R2,R2) ]) },
     { topEnds:DS5, botEnds:DS3, tag:"i7 / P7", cols:[ c(W.i7,I7,I7), c(W.p7,P7,P7) ] }
   ] } },

 { title:"Sequencing -- Read 1, then Read 2",
   c:"Read 1 reads the droplet barcode + UMI; Read 2 reads the probe, then the sample barcode.",
   d:"<b>R1</b> = droplet barcode + UMI. <b>R2</b> reads the <b>probe</b> first (~50 bp), then the <b>sample barcode</b> (~position 65) -- both in the same read.",
   mol:{ mols:[ libFlex([{from:2,to:4,dir:"right",label:"Read 1 · barcode + UMI"}]),
                libFlex([{from:7,to:10,dir:"left",label:"Read 2 · probe + sample BC"}]) ] } },

 { title:"The reads", special:"readsFlex",
   c:"R1 holds the droplet barcode + UMI; R2 holds the probe, then the sample barcode.",
   d:"The i7 / i5 indexes sit in the read header, as in 3′." },

 { title:"What the sequencer writes: FASTQ files", special:"filenames",
   c:"Same FASTQ files, same naming -- Flex changes the biology, not the file format.",
   d:"Droplet barcode + UMI in the <b>R1</b> file; probe + sample barcode in the <b>R2</b> file." },

 { title:"Extract the labels, match the probe", special:"probematch",
   c:"From the reads we pull four things -- and turn the probe into a gene.",
   d:"<b>Sample barcode</b> (which sample), <b>droplet barcode</b> (which cell), <b>UMI</b> (which molecule), plus the <b>probe</b> -- looked up in the probe set to give a <b>gene</b>. The molecule is now <b>(sample, droplet, UMI, gene)</b>." },

 { title:"…then deduplicated", special:"dedup",
   c:"Copies of the same (droplet, UMI, gene) collapse to one -- just like 3′.",
   d:"PCR copies vanish; real molecules remain. (The sample barcode then splits cells back into their samples.)" },

 { title:"…and it becomes the counts matrix", special:"measure",
   c:"Two distinct UMIs of " + CONTENT.gene + " in this droplet means a count of 2.",
   d:"Rows = droplets, columns = genes -- one matrix per sample. The same object you load in Scanpy or Seurat, built from probes instead of poly(A) capture." },
];

/* ---- small content helpers ---- */
function rep(ch, n){ return new Array(n + 1).join(ch); }
function fqBlock(title, body){ return '<div class="fqb"><div class="fqt">'+title+'</div><div class="fastq">'+body+'</div></div>'; }
function exBox(cls, seq, label){ return '<div class="exbox '+cls+'">'+seq+'<small>'+label+'</small></div>'; }

/* ---- SPECIAL: the four custom data panels --------------------------------- */
var SPECIAL = {
  // (12) what the sequencer writes: the double-stranded library, the R1/R2 file
  //      names, and how a 10x FASTQ file name is structured.
  filenames: function(){
    var cartoon = molHTML({ topEnds:DS5, botEnds:DS3, cols:(MODE === "flex" ? libFlexCols() : libCols()) });
    var r1 = "tinygex_S1_L001_<b>R1</b>_001.fastq.gz";
    var r2 = "tinygex_S1_L001_<b>R2</b>_001.fastq.gz";
    var map = "tinygex_S1_L001_R1_001.fastq.gz\n"
            + "└─┬───┘ │  └┬─┘ │  └┬┘ └──┬───┘\n"
            + "  │     │   │   │   │    file extension\n"
            + "  │     │   │   │   always 001\n"
            + "  │     │   │   Read indicator (R1 / R2 / I1)\n"
            + "  │     │   Sequencer lane (L001, L002, ...)\n"
            + "  │     Sample number in the run\n"
            + "  Sample prefix (the library name)";
    return cartoon
      + '<div class="fqset">'
      + fqBlock("Read 1 file", r1)
      + fqBlock("Read 2 file", r2)
      + fqBlock("How the name is built", map)
      + '</div>';
  },

  // (13) library cartoon with brackets over sequenced regions, plus the two FASTQ records
  reads: function(){
    var cartoon = molHTML({ topEnds:DS5, botEnds:DS3, cols:libCols(), annotTop:[
      {from:3,to:4,label:"Read 1"}, {from:8,to:8,label:"Index 1"},
      {from:1,to:1,label:"Index 2"}, {from:6,to:6,label:"Read 2"} ] });
    var idx = '<span class="x">'+CONTENT.i7+'</span><span class="h">+</span><span class="x">'+CONTENT.i5+'</span>';
    var r1 = '<span class="h">@'+CONTENT.readName+' 1:N:0:</span>'+idx+'\n'
           + '<span class="b">'+CONTENT.droplet+'</span><span class="u">'+CONTENT.umis[0]+'</span>\n+\n'+CONTENT.r1qual;
    var r2 = '<span class="h">@'+CONTENT.readName+' 2:N:0:</span>'+idx+'\n'
           + '<span class="ins">'+CONTENT.r2seq+'</span>\n+\n'+rep("J", CONTENT.r2seq.length);
    return cartoon + '<div class="fqset">' + fqBlock("Read 1 FASTQ", r1) + fqBlock("Read 2 FASTQ", r2) + '</div>';
  },

  // (14) extract barcode/UMI/fragment, align the fragment to a gene + location
  extract: function(){
    return '<div class="extract"><div class="exrow">'
      + exBox("b", CONTENT.droplet,                 "droplet barcode")
      + exBox("u", CONTENT.umis[0],                 "UMI")
      + exBox("m", CONTENT.r2seq.slice(0,12) + "…", "transcript fragment")
      + '</div><div class="exarr">align the fragment to the genome ↓</div>'
      + '<div class="exgene">'+CONTENT.gene+'<span class="loc">'+CONTENT.locus+'</span></div></div>';
  },

  // (15) PCR copies of several species collapse to one molecule each
  dedup: function(){
    var d = CONTENT.dedup;
    function row(sp){ return '<div class="ddrow">' + mini(30, d.dropletColor) + mini(24, sp.umi) + mini(sp.insert, "var(--mol)") + '</div>'; }
    var copies = '', collapsed = '';
    d.species.forEach(function(sp){ for(var k=0;k<sp.copies;k++) copies += row(sp); collapsed += row(sp); });
    return '<div class="ddwrap">'
      + '<div class="ddcol"><div class="ddh">PCR copies</div>'+copies+'</div>'
      + '<div class="ddarrow">collapse on<br>(droplet, UMI, gene)<br>→</div>'
      + '<div class="ddcol"><div class="ddh">molecules</div>'+collapsed+'</div></div>';
  },

  // (16) the measurement sentence + the counts matrix
  measure: function(){
    var umis = CONTENT.umis.map(function(u){ return '<span class="ub">UMI · '+u+'</span>'; }).join('');
    var line = '<div class="mline"><span>We measured</span>'
      + '<div class="umistack">'+umis+'</div>'
      + '<span>distinct molecules of</span><span class="gbox">'+CONTENT.gene+'</span>'
      + '<span>in droplet</span><span class="bcbox">'+CONTENT.dropletShort+'</span></div>';
    var m = CONTENT.matrix;
    var head = "<tr><td class='rl'></td>" + m.genes.map(function(g){ return "<th>"+g+"</th>"; }).join("") + "</tr>";
    var body = m.rows.map(function(r, ri){
      return "<tr><td class='rl'>"+r.bc+"</td>" + r.counts.map(function(v, gi){
        var hit = (ri === m.hit[0] && gi === m.hit[1]);
        return "<td class='"+(hit?"hit":"")+"'>"+(v || "·")+"</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="measure">'+line+'<table class="mx">'+head+body+'</table></div>';
  },

  // ---- Flex (probe-based) variants -----------------------------------------
  // (Flex) the reads: R2 holds the probe (not a random transcript fragment)
  readsFlex: function(){
    var cartoon = molHTML({ topEnds:DS5, botEnds:DS3, cols:libFlexCols(), annotTop:[
      {from:3,to:4,label:"Read 1"}, {from:11,to:11,label:"Index 1"},
      {from:1,to:1,label:"Index 2"}, {from:7,to:9,label:"Read 2"} ] });
    var idx = '<span class="x">'+CONTENT.i7+'</span><span class="h">+</span><span class="x">'+CONTENT.i5+'</span>';
    var r1 = '<span class="h">@'+CONTENT.readName+' 1:N:0:</span>'+idx+'\n'
           + '<span class="b">'+CONTENT.droplet+'</span><span class="u">'+CONTENT.umis[0]+'</span>\n+\n'+CONTENT.r1qual;
    var r2 = '<span class="h">@'+CONTENT.readName+' 2:N:0:</span>'+idx+'\n'
           + '<span class="pr">'+CONTENT.probeSeq+'</span>'+CONTENT.r2spacer+'<span class="sb">'+CONTENT.sampleBC+'</span>\n+\n'+rep("J", CONTENT.probeSeq.length+CONTENT.r2spacer.length+CONTENT.sampleBC.length);
    return cartoon + '<div class="fqset">' + fqBlock("Read 1 FASTQ", r1) + fqBlock("Read 2 FASTQ (probe + sample barcode)", r2) + '</div>';
  },

  // (Flex) extract barcode/UMI/probe, then look the probe up in the probe set
  probematch: function(){
    return '<div class="extract"><div class="exrow">'
      + exBox("sb", CONTENT.sampleBC,                 "sample barcode")
      + exBox("b", CONTENT.droplet,                  "droplet barcode")
      + exBox("u", CONTENT.umis[0],                  "UMI")
      + exBox("pr", CONTENT.probeSeq.slice(0,12)+"…","probe sequence")
      + '</div><div class="exarr">look the probe up in the probe set ↓</div>'
      + '<div class="exgene">'+CONTENT.gene+'<span class="loc">probe set entry &middot; '+CONTENT.gene+'</span></div></div>';
  }
};
