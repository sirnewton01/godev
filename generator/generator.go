// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"strings"
	"go/build"
	"runtime"
	"strconv"
	"time"
)

var (
	gopath = build.Default.GOPATH
	goroot = ""
)

func init() {
	goroot = runtime.GOROOT()
}

func main() {
	file, err := os.Create("go-code-assist.js")
	
	if err != nil {
		panic(err)
	}
	
	defer file.Close()
	
	file.WriteString("// This file contains data for code assist and is generated \n//  from the Go version \""+runtime.Version()+"\" standard langauge library.\n//  "+time.Now().String());
	file.WriteString("\n");
	file.WriteString("var goCodeAssistTemplates = [\n");
	
	rootDir, err := os.Open(goroot + "/src/pkg");
	if err != nil {
		panic(err)
	}
	defer rootDir.Close()
	
	findPackages(rootDir, goroot + "/src/pkg", "" , file)
	
	file.WriteString("];\n");
}

func findPackages(rootDir *os.File, path string, pkg string, outputFile *os.File) {
	infos, err := rootDir.Readdir(-1)
	if err != nil {
		panic(err)
	}
	
	for _, info := range(infos) {
		if info.IsDir() {
			childDir, err := os.Open(path+"/"+info.Name())
			if err != nil {
				panic(err)
			}
			defer childDir.Close()
			
			findPackages(childDir, path + "/" + info.Name(), info.Name(), outputFile)
		} else if strings.HasSuffix(info.Name(), ".go") {
			fset := token.NewFileSet()
			tree, err := parser.ParseFile(fset, path+"/"+info.Name(), nil, 0)
			if err != nil {
				panic(err)
			}
			file, err := os.Open(path+"/"+info.Name())
			if err != nil {
				panic(err)
			}
			defer file.Close()
			
			for _, decl := range(tree.Decls) {
				if funcDecl,ok := decl.(*ast.FuncDecl); ok {
					// This is a normal function (not method)
					if funcDecl.Recv == nil && funcDecl.Name.IsExported() {
						//ast.Print(fset, funcDecl)
						qname := pkg + "." + funcDecl.Name.Name

						// Extract the function declaration (params, return values)
						beginPos := funcDecl.Type.Pos() - 1
						endPos := funcDecl.Type.End()
						buffer := make([]byte, endPos-beginPos, endPos-beginPos)
						bytesRead, err := file.ReadAt(buffer, int64(beginPos))
						if err != nil {
							panic(err)
						}
						if bytesRead != len(buffer) {
							panic("Could not read all of the function parameters.")
						}
						decl := pkg+"."+strings.TrimSpace(strings.Replace(string(buffer), "func ", "", 1))
						
						parmNames := ""
						parmRanges := ""
						parmOffset := len(qname) + 1
						firstParm := true
						
						for _,parm := range(funcDecl.Type.Params.List) {
							for _,n := range(parm.Names) {
								name := n.Name;
								if !firstParm {
									parmNames = parmNames + ", "
									parmRanges = parmRanges + ", "
									parmOffset = parmOffset + 2
								}
								parmNames = parmNames + name
								parmRanges = parmRanges + strconv.Itoa(parmOffset)
								parmRanges = parmRanges + ", " + strconv.Itoa(len(name))
								parmOffset = parmOffset + len(name)
								
								firstParm = false
							}
						}
					
						outputFile.WriteString("\t\""+qname+"\", \""+decl+"\", \""+qname+"("+parmNames+")\",["+parmRanges+"],\n");
					}
				}
				
				if genDecl,ok := decl.(*ast.GenDecl); ok {
					if genDecl.Tok == token.VAR || genDecl.Tok == token.CONST {
						for _,spec := range(genDecl.Specs) {
							if valueSpec,ok := spec.(*ast.ValueSpec); ok {
								for _,name := range(valueSpec.Names) {
									if name.IsExported() {
										qname := pkg + "." + name.Name
										
										outputFile.WriteString("\t\""+qname+"\", \""+qname+"\", \""+qname+"\", [],\n");
									}
								}
							}
						}
					}
				}
			}
		}
	}
} 
