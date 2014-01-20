// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"net/http"
	"reflect"
	"strconv"
)

type Entry struct {
	Line  string `json:"line"`
	Label string `json:"label"`
}

func outlineHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	fileset := token.NewFileSet()
	file, err := parser.ParseFile(fileset, "", req.Body, 0)

	if err != nil {
		ShowError(writer, 400, "Error parsing go source", err)
		return true
	}

	outline := []Entry{}

	ast.Inspect(file, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			if x.Pos().IsValid() {
				line := strconv.FormatInt(int64(fileset.Position(x.Pos()).Line), 10)
				name := x.Name.Name
				if name != "" {
					label := "func "

					if x.Recv.NumFields() > 0 {
						label = label + "(" + fileListStr(x.Recv) + ") "
					}

					label = label + name + "("
					if x.Type.Params.NumFields() > 0 {
						label = label + fileListStr(x.Type.Params)
					}
					label = label + ")"

					if x.Type.Results.NumFields() > 0 {
						if x.Type.Results.NumFields() == 1 {
							label = label + " " + fileListStr(x.Type.Results)
						} else {
							label = label + " (" + fileListStr(x.Type.Results) + ")"
						}
					}

					outline = append(outline, Entry{Line: line, Label: label})
				}
			}
		case *ast.GenDecl:
			if x.Tok == token.TYPE {
				for _, spec := range x.Specs {
					if spec.Pos().IsValid() {
						typeSpec, ok := spec.(*ast.TypeSpec)
						if ok {
							line := strconv.FormatInt(int64(fileset.Position(spec.Pos()).Line), 10)
							label := typeSpec.Name.Name
							if label != "" {
								label = "type " + label
								outline = append(outline, Entry{Line: line, Label: label})
							}
						}
					}
				}
			} else if x.Tok == token.IMPORT {
				line := strconv.FormatInt(int64(fileset.Position(x.Pos()).Line), 10)
				label := "IMPORT"
				outline = append(outline, Entry{Line: line, Label: label})
			} else if x.Tok == token.CONST {
				line := strconv.FormatInt(int64(fileset.Position(x.Pos()).Line), 10)
				label := "CONST"
				outline = append(outline, Entry{Line: line, Label: label})
			}
		}
		return true
	})

	ShowJson(writer, 200, outline)
	return true
}

func fileListStr(t *ast.FieldList) string {
	label := ""

	for argIdx, arg := range t.List {
		for nameIdx, name := range arg.Names {
			label = label + name.Name

			if nameIdx != len(arg.Names)-1 {
				label = label + ","
			}
		}

		if len(arg.Names) != 0 {
			label = label + " "
		}

		label = label + typeStr(arg.Type)

		if argIdx != len(t.List)-1 {
			label = label + ", "
		}
	}

	return label
}

func typeStr(t ast.Expr) string {
	switch e := t.(type) {
	case *ast.StarExpr:
		return "*" + typeStr(e.X)
	case *ast.Ident:
		return e.Name
	case *ast.SelectorExpr:
		return typeStr(e.X) + "." + e.Sel.Name
	case *ast.ArrayType:
		return "[]" + typeStr(e.Elt)
	default:
		return "<" + reflect.TypeOf(t).String() + ">"
	}
}
