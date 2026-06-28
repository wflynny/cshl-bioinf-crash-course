#!/usr/bin/env bash
#
# reset_1.10.sh — restore $COURSE/work/1.10 to a clean starting state.
#
# For the TA: if a student wedges module 1.10 (Putting It All Together), this
# wipes their 1.10 working dir and rebuilds the clean inputs:
#   $COURSE/work/1.10/fastqs/     symlinks to each tiny FASTQ
#   $COURSE/work/1.10/tiny_ref    symlink to the tiny reference
#
# Usage:
#   bash reset_1.10.sh            # CSHL HPC (default)
#   bash reset_1.10.sh --local    # local JAX testing on Elion (same ROOT as setup)
#
# WARNING: this deletes everything under $COURSE/work/1.10 (including any
# cellranger run output). That is the point of a reset — confirm with the
# student first.
#
# !!! UNVERIFIED: relies on the same paths as setup_day1.sh, and on setup having
# !!! already created $COURSE/work/data. Verify on the HPC.

set -euo pipefail

# --- resolve COURSE the same way setup_day1.sh does ----------------------------
PROFILE="${CRASH_PROFILE:-cshl}"
for arg in "$@"; do
  case "${arg}" in
    --local|--jax) PROFILE="local" ;;
    --cshl)        PROFILE="cshl" ;;
    *) echo "unknown argument: ${arg}" >&2; exit 2 ;;
  esac
done

case "${PROFILE}" in
  cshl)
    export COURSE="${COURSE:-/grid/singlecellcourse/home/${USER}}" ;;      # UNVERIFIED
  local)
    ROOT="${ROOT:-/sc/service/analysis/develop/flynnb/cshl-crash-course}"
    export COURSE="${COURSE:-${ROOT}/home/${USER}}" ;;
  *)
    echo "unknown CRASH_PROFILE: '${PROFILE}' (use cshl|local)" >&2; exit 2 ;;
esac

: "${COURSE:?COURSE is empty — refusing to rm -rf}"   # guard against rm -rf /work/1.10 on an unset path

data_dir="${COURSE}/work/data"
if [ ! -d "${data_dir}/tiny_fastqs" ] || [ ! -d "${data_dir}/tiny_ref" ]; then
  echo "ERROR: ${data_dir}/{tiny_fastqs,tiny_ref} not found." >&2
  echo "       Run setup_day1.sh first (matching --local if used here)." >&2
  exit 1
fi

module_dir="${COURSE}/work/1.10"
rm -rf "${module_dir}"
mkdir -p "${module_dir}/fastqs"

# Fresh symlinks to each FASTQ (links-to-symlinks resolve through to the source).
ln -sfn "${data_dir}/tiny_fastqs/"*.fastq.gz "${module_dir}/fastqs/"
ln -sfn "${data_dir}/tiny_ref"               "${module_dir}/tiny_ref"

echo "1.10 reset (profile: ${PROFILE})."
echo "  ${module_dir}/fastqs/   -> $(ls "${module_dir}/fastqs" | wc -l | tr -d ' ') FASTQ symlink(s)"
echo "  ${module_dir}/tiny_ref  -> reference symlink"
