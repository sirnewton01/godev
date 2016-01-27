// Copyright 2014 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"

	"golang.org/x/net/websocket"
)

type ConnectResult struct {
	AttachWsURI string `json:"attachWsURI"`
}

func terminalSocket(ws *websocket.Conn) {
	c := createShellCommand()
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

func terminalHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST" && len(pathSegs) == 2 && pathSegs[1] == "connect":
		result := &ConnectResult{}

		if hostName == loopbackHost {
			result.AttachWsURI = "ws://" + hostName + ":" + *port + "/docker/socket"
		} else {
			result.AttachWsURI = "wss://" + hostName + ":" + *port + "/docker/socket"
		}

		ShowJson(writer, 200, result)
		return true
	}

	return false
}
