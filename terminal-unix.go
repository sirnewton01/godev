// Copyright 2014 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build linux darwin

package main

import (
	"io"
	"os/exec"

	"github.com/kr/pty"
)

func createShellCommand() *exec.Cmd {
	return exec.Command("sh")
}

func start(c *exec.Cmd) (io.ReadCloser, io.WriteCloser, error) {
	f, err := pty.Start(c)

	return f, f, err
}