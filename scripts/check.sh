!/bin/bash

vocab_file='../resources/data/vocab-v2.jsonl'
word=$1

if [ -z "$word" ]; then
  echo "Usage: $0 <word>"
  exit 1
fi

grep $word $vocab_file |jq .