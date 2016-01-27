// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"go/build"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"golang.org/x/net/websocket"
)

func debugSocket(ws *websocket.Conn) {
	url := ws.Request().URL

	// Short circuit for "go run" case
	if url.Query().Get("run") != "" {
		goRun(ws, url.Query().Get("run"))
		return
	}

	debug := url.Query().Get("debug") == "true"
	race := url.Query().Get("race") == "true"
	cmd := url.Query().Get("cmd")
	params := url.Query().Get("params")
	rungodbg := false

	paramList := strings.Split(params, " ")

	if debug {
		godbgtest := exec.Command("godbg")
		err := godbgtest.Run()
		if err == nil {
			rungodbg = true
		}
	}

	// clean and install the command to make sure it can be compiled
	//  and is up-to-date. Godbg will do its own installation afterwards
	//  but this is a good check here.
	cleanCmd := exec.Command("go", "clean", "-i", "-r", cmd)
	cleanCmd.Run()
	// Ignore errors on clean because recursive clean often fails trying to delete
	//  files from the Go installation directory, which may not be modifiable by
	//  the current user. This is a best attempt at this stage.

	installCmd := exec.Command("go", "install", cmd)
	if race {
		installCmd = exec.Command("go", "install", "-race", cmd)
	}
	err := installCmd.Run()
	if err != nil {
		ws.Write([]byte("Error installing command:" + err.Error()))
		ws.Close()
		return
	}

	if !rungodbg {
		commandName := filepath.Base(cmd)
		gopaths := filepath.SplitList(build.Default.GOPATH)
		foundCommand := false

		for _, gopath := range gopaths {
			cmdPath := filepath.Join(gopath, "bin", commandName)
			_, err := os.Stat(cmdPath)
			if err == nil {
				cmd = cmdPath
				foundCommand = true
				break
			}

			// Try again with windows .exe extension
			cmdPath = filepath.Join(gopath, "bin", commandName+".exe")
			_, err = os.Stat(cmdPath)
			if err == nil {
				cmd = cmdPath
				foundCommand = true
				break
			}
		}

		if !foundCommand {
			ws.Write([]byte("Command not found in any GOPATH"))
			ws.Close()
			return
		}
	} else {
		paramList = append([]string{"-openBrowser=false", cmd}, paramList...)
		cmd = "godbg"
	}

	c := exec.Command(cmd, paramList...)
	out, in, err := start(c)
	if err != nil {
		panic(err)
	}

	go func() {
		for {
			buf := make([]byte, 1024, 1024)
			n, err := out.Read(buf)
			if err != nil {
				break
			}

			n, err = ws.Write(buf[:n])
			if err != nil {
				break
			}
		}

		ws.Close()
	}()

	buf := make([]byte, 1024, 1024)
	for {
		n, err := ws.Read(buf)
		if err != nil {
			break
		}

		n, err = in.Write(buf[:n])
		if err != nil {
			break
		}
	}

	in.Close()
	out.Close()
	c.Wait()
}

func goRun(ws *websocket.Conn, file string) {
	var ospath string
	gopaths := filepath.SplitList(build.Default.GOPATH)

	for _, gopath := range gopaths {
		p := filepath.Join(gopath, "src", file)
		_, err := os.Stat(p)
		if err == nil {
			ospath = p
			break
		}
	}

	// File was not found
	if ospath == "" {
		return
	}

	c := exec.Command("go", "run", ospath)
	out, in, err := start(c)
	if err != nil {
		panic(err)
	}

	go func() {
		for {
			buf := make([]byte, 1024, 1024)
			n, err := out.Read(buf)
			if err != nil {
				break
			}

			n, err = ws.Write(buf[:n])
			if err != nil {
				break
			}
		}

		ws.Close()
	}()

	buf := make([]byte, 1024, 1024)
	for {
		n, err := ws.Read(buf)
		if err != nil {
			break
		}

		n, err = in.Write(buf[:n])
		if err != nil {
			break
		}
	}

	out.Close()
	in.Close()
	c.Wait()
}

func debugHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET" && len(pathSegs) == 2 && pathSegs[1] == "commands":
		commands := []string{}

		srcDirs := build.Default.SrcDirs()

		for _, srcDir := range srcDirs {
			// Skip stuff that is in the GOROOT
			if filepath.HasPrefix(srcDir, goroot) {
				continue
			}

			filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
				if info.IsDir() {
					pkg, err := build.Default.ImportDir(path, 0)

					if err == nil && pkg.IsCommand() {
						commands = append(commands, pkg.ImportPath)
					}
				}
				return nil
			})
		}

		ShowJson(writer, 200, commands)
		return true
	case req.Method == "GET" && len(pathSegs) == 2 && pathSegs[1] == "debugSupport":
		godbgtest := exec.Command("godbg")
		err := godbgtest.Run()
		if err != nil {
			ShowError(writer, 404, "godbg command could not be found on the system path. Install using 'go get github.com/sirnewton01/godbg', install it and add the binary to the path for debugging support.", err)
			return true
		}

		ShowJson(writer, 200, []string{})
		return true
	}

	return false
}
