#!/usr/bin/env bash
#
# reset_1.10.sh -- restore ~/work/1.10 to a clean starting state (TA tool).
#
# Wipes ~/work/1.10 and rebuilds the clean inputs:
#   ~/work/1.10/fastqs/    symlinks to each tiny FASTQ
#   ~/work/1.10/tiny_ref   symlink to the tiny reference
#
# Usage:
#   bash reset_1.10.sh            # on the cluster
#   bash reset_1.10.sh --local    # local testing (same ROOT as setup_day1.sh)
#
# WARNING: deletes everything under ~/work/1.10 (including cellranger output).
# Confirm with the student first.

set -euo pipefail

PROFILE="${CRASH_PROFILE:-cshl}"
for arg in "$@"; do
  case "${arg}" in
    --local|--jax) PROFILE="local" ;;
    --cshl)        PROFILE="cshl" ;;
    *) echo "unknown argument: ${arg}" >&2; exit 2 ;;
  esac
done

if [ "${PROFILE}" = "local" ]; then
  ROOT="${ROOT:-/sc/service/analysis/develop/flynnb/cshl-crash-course}"
  WORK="${ROOT}/home/${USER}/work"
else
  WORK="${HOME}/work"
fi
: "${WORK:?WORK is empty -- refusing to rm -rf}"

data="${WORK}/data"
if [ ! -d "${data}/tiny_fastqs" ] || [ ! -d "${data}/tiny_ref" ]; then
  echo "ERROR: ${data}/{tiny_fastqs,tiny_ref} not found. Run setup_day1.sh first." >&2
  exit 1
fi

module_dir="${WORK}/1.10"
rm -rf "${module_dir}"
mkdir -p "${module_dir}/fastqs"
ln -sfn "${data}/tiny_fastqs/"*.fastq.gz "${module_dir}/fastqs/"
ln -sfn "${data}/tiny_ref"               "${module_dir}/tiny_ref"

echo "1.10 reset (profile: ${PROFILE})."
echo "  ${module_dir}/fastqs/   -> $(ls "${module_dir}/fastqs" | wc -l | tr -d ' ') FASTQ symlink(s)"
echo "  ${module_dir}/tiny_ref  -> reference symlink"
