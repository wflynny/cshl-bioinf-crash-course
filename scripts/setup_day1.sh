#!/usr/bin/env bash
#
# setup_day1.sh -- one-time per-student setup for Day 1 of the CSHL crash course.
#
# Creates your per-module working dirs and a single read-only link to the shared
# course data, all under your home (~):
#   ~/work/<module>        per-module working dirs (1.05 .. 1.10)
#   ~/work/data -> SHARED  read-only link to the shared course data
#
# Run it ONCE, near the end of module 1.05:
#   bash /grid/singlecellcourse/data/crash-course/2026/setup_day1.sh
# Safe to re-run (idempotent). Nothing is added to your shell; no variables to set.
#
# ---------------------------------------------------------------------------
# The shared-data location is auto-detected: it prefers the new
# /grid/courses/data/singlecell/crash-course if that exists, otherwise the 2026
# staging dir. Override with SHARED=/path if needed.
# For local testing off-cluster:  --local [--seed-test-data]   (optional ROOT=...)
#
# !!! UNVERIFIED: the /grid paths are placeholders until confirmed on the HPC.
# ---------------------------------------------------------------------------

set -euo pipefail

PROFILE="${CRASH_PROFILE:-cshl}"
SEED_TEST_DATA=0
for arg in "$@"; do
  case "${arg}" in
    --local|--jax)    PROFILE="local" ;;
    --cshl)           PROFILE="cshl" ;;
    --seed-test-data) SEED_TEST_DATA=1 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: ${arg} (try --help)" >&2; exit 2 ;;
  esac
done

# --- resolve WORK (~/work) and SHARED (read-only course data) ------------------
if [ "${PROFILE}" = "local" ]; then
  ROOT="${ROOT:-/sc/service/analysis/develop/flynnb/cshl-crash-course}"
  WORK="${ROOT}/home/${USER}/work"
  SHARED="${SHARED:-${ROOT}/shared}"
else
  WORK="${HOME}/work"
  if [ -z "${SHARED:-}" ]; then        # auto-detect: prefer new location, else 2026
    for cand in /grid/courses/data/singlecell/crash-course \
                /grid/singlecellcourse/data/crash-course/2026; do
      if [ -d "${cand}" ]; then SHARED="${cand}"; break; fi
    done
    SHARED="${SHARED:-/grid/singlecellcourse/data/crash-course/2026}"   # UNVERIFIED default
  fi
fi

echo "profile : ${PROFILE}"
echo "WORK    : ${WORK}"
echo "SHARED  : ${SHARED}"
echo

# --- optionally seed PLACEHOLDER shared data (testing only) --------------------
if [ "${SEED_TEST_DATA}" -eq 1 ]; then
  echo "Seeding PLACEHOLDER data under ${SHARED} (not real sequencing data)..."
  mkdir -p "${SHARED}/tiny_fastqs"
  for lane in L001 L002; do for read in I1 R1 R2; do
    printf '' | gzip > "${SHARED}/tiny_fastqs/tinygex_S1_${lane}_${read}_001.fastq.gz"
  done; done
  mkdir -p "${SHARED}/tiny_ref/fasta" "${SHARED}/tiny_ref/genes" "${SHARED}/tiny_ref/star"
  : > "${SHARED}/tiny_ref/reference.json"; : > "${SHARED}/tiny_ref/fasta/genome.fa"
  printf '' | gzip > "${SHARED}/tiny_ref/genes/genes.gtf.gz"
  echo
fi

# --- fail loudly if the shared data isn't where we think it is -----------------
if [ ! -d "${SHARED}/tiny_fastqs" ] || [ ! -d "${SHARED}/tiny_ref" ]; then
  echo "ERROR: shared course data not found under:" >&2
  echo "         ${SHARED}   (expected tiny_fastqs/ and tiny_ref/ inside)" >&2
  echo "       Set SHARED=/correct/path, or for local testing run:" >&2
  echo "         bash $(basename "$0") --local --seed-test-data" >&2
  exit 1
fi

# --- per-module working dirs (1.05 Navigating .. 1.10 Putting-It-All-Together) --
mkdir -p "${WORK}"/{1.05,1.06,1.07,1.08,1.09,1.10}

# --- single read-only passthrough to the shared course data --------------------
# ln -sfn: replace any existing link and don't nest inside it on re-run.
ln -sfn "${SHARED}" "${WORK}/data"

echo "Setup complete."
echo "  working tree : ${WORK}   (1.05 .. 1.10)"
echo "  shared data  : ${WORK}/data -> ${SHARED}"
echo
echo "Use  ~/work/<module>  for your work, and  ~/work/data/...  for the shared"
echo "course data (tiny_fastqs, tiny_ref, exercise sets). Never write into data/."
