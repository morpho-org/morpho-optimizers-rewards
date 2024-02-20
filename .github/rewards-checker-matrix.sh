#!/bin/bash

echo -n 'matrix={"include":['
for proof in $(find . -regex "\./distribution/vaults/[^/]*\.json" -o -name "proofs.json" | sort); do
    echo -n '{"proof":"'$proof'","verify":"true"},'
done
echo -n ']}'
