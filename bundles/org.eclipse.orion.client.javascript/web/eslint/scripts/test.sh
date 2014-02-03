#!/bin/bash

TESTS=$(find tests -name "*.js")

mocha ${TESTS} 
