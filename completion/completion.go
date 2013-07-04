// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package completion

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"strings"
	"go/build"
	"runtime"
	"errors"
)

var (
	gopath = build.Default.GOPATH
	goroot = ""
)

func init() {
	goroot = runtime.GOROOT()
}

func getFuncCompletion(funcDecl *ast.FuncDecl) string {
	return funcDecl.Name.Name + "()"
}

func FindCompletions(pkg string, declName string) ([]string, error) {
	_,err := os.Stat(goroot + "/src/pkg/" + pkg)
	if err == nil {
		return findCompletions(goroot + "/src/pkg/" + pkg, pkg, declName)
	}
	
	_,err = os.Stat(gopath + "/src/" + pkg)
	if err == nil {
		return findCompletions(gopath + "/src/" + pkg, pkg, declName)
	}
	
	return nil, errors.New("Package '" + pkg + "' not found")
}

// TODO interface inheritance
// TODO type blocks
// TODO provide both a summary and the real completion in the return value
func findCompletions(path string, pkg string, declName string) ([]string, error) {
	file, err := os.Open(path)
	
	if err != nil {
		return nil, err
	}
	
	defer file.Close()
	
	completions := []string{}
	
	children, err := file.Readdir(-1)
	
	if err != nil {
		return nil, err
	}
	
	for _, child := range(children) {
		if strings.HasSuffix(child.Name(), ".go") {
			fset := token.NewFileSet()
			tree, err := parser.ParseFile(fset, path+"/"+child.Name(), nil, 0)
			if err != nil {
				panic(err)
			}
			
			if tree.Name.Name == pkg || strings.HasSuffix(pkg, "/"+tree.Name.Name) {
				for _, decl := range(tree.Decls) {
					if funcDecl,ok := decl.(*ast.FuncDecl); ok {
						// This is a method for the provided declaration in this package
						if funcDecl.Recv != nil  && declName != "" {
							typeExpr := funcDecl.Recv.List[0].Type
							var expr ast.Expr = typeExpr
							
							for {
								if starExpr,ok := expr.(*ast.StarExpr); ok {
									expr = starExpr.X
								}
								if _,ok := expr.(*ast.Ident); ok {
									break
								}
							}
							
							ident := expr.(*ast.Ident)
							
							if ident.Name == declName && funcDecl.Name.IsExported() {
								//ast.Print(fset, funcDecl)
								completions = append(completions, getFuncCompletion(funcDecl))
							}
						}
						
						// This is a function of the package and no declaration is provided
						if funcDecl.Recv == nil && declName == "" && funcDecl.Name.IsExported() {
							//ast.Print(fset, funcDecl)
							completions = append(completions, getFuncCompletion(funcDecl))
						}
					}
					
					if genDecl,ok := decl.(*ast.GenDecl); ok {
						if genDecl.Tok == token.TYPE {
							for _,spec := range(genDecl.Specs) {
								if typeSpec,ok := spec.(*ast.TypeSpec); ok {
									if declName != "" && typeSpec.Name.IsExported() && typeSpec.Name.Name == declName {
										if interfType,ok := typeSpec.Type.(*ast.InterfaceType); ok {
											for _,methodDecl := range(interfType.Methods.List) {
												if len(methodDecl.Names) == 1 && methodDecl.Names[0].IsExported() {
													//ast.Print(fset, methodDecl)
													completions = append(completions, methodDecl.Names[0].Name+"()")
												}
											}
										}
										if structType,ok := typeSpec.Type.(*ast.StructType); ok {
											for _,fieldDecl := range(structType.Fields.List) {
												if len(fieldDecl.Names) == 1 && fieldDecl.Names[0].IsExported() {
													//ast.Print(fset, fieldDecl)
													completions = append(completions, fieldDecl.Names[0].Name)
												}
											}
										}
									}
								}
							}
						}
						if declName == "" && (genDecl.Tok == token.VAR || genDecl.Tok == token.CONST) {
							for _,spec := range(genDecl.Specs) {
								if valueSpec,ok := spec.(*ast.ValueSpec); ok {
									for _,name := range(valueSpec.Names) {
										completions = append(completions, name.Name)
									}
								}
							}
						}
					}
				}
			}
		}
	}
	
	return completions, nil
}
