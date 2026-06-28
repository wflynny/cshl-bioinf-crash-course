#!/usr/bin/env bash
#
# setup_day1.sh — one-time per-student setup for Day 1 of the CSHL crash course.
#
# Establishes the single working-directory convention used by every Day 1 module:
#   $COURSE/work/<module>          per-module working dirs
#   $COURSE/work/data/{tiny_fastqs,tiny_ref}   symlinks into the read-only source
#
# Run once after logging in to the HPC:
#   bash setup_day1.sh
# It is safe to re-run (idempotent).
#
# ------------------------------------------------------------------------------
# Environment profiles
# ------------------------------------------------------------------------------
# Default profile targets the CSHL HPC. For local testing on the JAX 'Elion'
# cluster, reroute every path under one ROOT instead of /grid:
#   bash setup_day1.sh --local
#
# Override any of ROOT / COURSE / SHARED from the environment without editing
# this file, e.g.:
#   ROOT=/sc/service/analysis/develop/flynnb/cshl-crash-course bash setup_day1.sh --local
#   SHARED=/some/other/source bash setup_day1.sh
#
# Add --seed-test-data (handy with --local) to create placeholder tiny_fastqs/
# and tiny_ref/ under SHARED so the symlink plumbing can be dry-run even where
# the real dataset isn't staged yet.
#
# !!! UNVERIFIED: the cshl-profile /grid paths below are placeholders confirmed
# !!! by no one yet. Verify on the actual HPC before this ships to students.

set -euo pipefail

# --- parse args ----------------------------------------------------------------
PROFILE="${CRASH_PROFILE:-cshl}"
SEED_TEST_DATA=0
for arg in "$@"; do
  case "${arg}" in
    --local|--jax)    PROFILE="local" ;;
    --cshl)           PROFILE="cshl" ;;
    --seed-test-data) SEED_TEST_DATA=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: ${arg} (try --help)" >&2; exit 2 ;;
  esac
done

# --- resolve locations per profile ---------------------------------------------
case "${PROFILE}" in
  cshl)
    # CONFIRM BEFORE USE (UNVERIFIED)
    export COURSE="${COURSE:-/grid/singlecellcourse/home/${USER}}"
    SHARED="${SHARED:-/grid/singlecellcourse/data/crash-course}"
    ;;
  local)
    # For local JAX testing on Elion. Everything lives under one ROOT.
    ROOT="${ROOT:-/sc/service/analysis/develop/flynnb/cshl-crash-course}"
    export COURSE="${COURSE:-${ROOT}/home/${USER}}"
    SHARED="${SHARED:-${ROOT}/shared}"
    ;;
  *)
    echo "unknown CRASH_PROFILE: '${PROFILE}' (use cshl|local)" >&2; exit 2 ;;
esac

echo "profile : ${PROFILE}"
echo "COURSE  : ${COURSE}"
echo "SHARED  : ${SHARED}"
echo

# --- optionally seed placeholder source data (testing only) --------------------
# Creates the canonical tiny dataset layout with empty-but-valid files so the
# rest of the script (and reset_1.09.sh) can be exercised end-to-end locally.
if [ "${SEED_TEST_DATA}" -eq 1 ]; then
  echo "Seeding PLACEHOLDER test data under ${SHARED} (not real sequencing data)..."
  mkdir -p "${SHARED}/tiny_fastqs"
  for lane in L001 L002; do
    for read in I1 R1 R2; do
      printf '' | gzip > "${SHARED}/tiny_fastqs/tinygex_S1_${lane}_${read}_001.fastq.gz"
    done
  done
  mkdir -p "${SHARED}/tiny_ref/fasta" "${SHARED}/tiny_ref/genes" "${SHARED}/tiny_ref/star"
  : > "${SHARED}/tiny_ref/reference.json"
  : > "${SHARED}/tiny_ref/fasta/genome.fa"
  printf '' | gzip > "${SHARED}/tiny_ref/genes/genes.gtf.gz"
  echo
fi

# --- fail loudly if the source data isn't where we think it is -----------------
# Better a clear error now than 20 students with dangling symlinks mid-lesson.
for src in "${SHARED}/tiny_fastqs" "${SHARED}/tiny_ref"; do
  if [ ! -d "${src}" ]; then
    echo "ERROR: expected read-only source directory not found:" >&2
    echo "         ${src}" >&2
    echo "       Fix SHARED (currently '${SHARED}'), or for local testing run:" >&2
    echo "         bash $(basename "$0") --local --seed-test-data" >&2
    exit 1
  fi
done

# --- make COURSE persist across login sessions (idempotent) --------------------
# Only for the real course profile; don't touch a tester's shell config locally.
if [ "${PROFILE}" = "cshl" ]; then
  if ! grep -q 'export COURSE=' "${HOME}/.bashrc" 2>/dev/null; then
    echo 'export COURSE=/grid/singlecellcourse/home/$USER' >> "${HOME}/.bashrc"  # UNVERIFIED path
  fi
else
  echo "(local profile: leaving ${HOME}/.bashrc untouched; export COURSE=${COURSE} yourself if needed)"
fi

# --- per-module working dirs ---------------------------------------------------
mkdir -p "${COURSE}/work"/{1.04,1.05,1.06,1.07,1.08,1.09}

# --- one read-only data location, symlinked from the shared source -------------
# ln -sfn: force-replace and don't dereference an existing symlink-to-dir, so
# re-running points the link at the current source rather than nesting inside it.
mkdir -p "${COURSE}/work/data"
ln -sfn "${SHARED}/tiny_fastqs" "${COURSE}/work/data/tiny_fastqs"
ln -sfn "${SHARED}/tiny_ref"    "${COURSE}/work/data/tiny_ref"

# --- report where everything now lives -----------------------------------------
echo "Setup complete."
echo "  working tree : ${COURSE}/work"
echo "  modules      : 1.04,1.05,1.06,1.07,1.08,1.09"
echo "  tiny dataset : ${COURSE}/work/data/{tiny_fastqs,tiny_ref}"
echo
echo "The dataset directories are symlinks into the read-only source; work in"
echo "your module dirs (e.g. cd \$COURSE/work/1.05) and never write into data/."
