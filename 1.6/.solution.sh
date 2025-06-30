#!/usr/bin/env bash

set -euo pipefail

result_dir=${1}

if [ ! -d ${result_dir} ]
then
  echo "${result_dir} doesn't exist!  Exiting"
  exit 
fi

for filename in ${result_dir}/*.gz
do
  uncomp_filename=${filename%.*}    # strip off the .gz suffix
  gunzip ${Filename}                # unzip the file
  wc -l ${uncomp_filename}          # count the lines in the unziped filename
  gzip ${uncomp_filename}           # rezip it
done
echo "Done!"
