// Copyright 2014 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build !linux,!darwin

package main

import (
	"io"
	"os/exec"
	"strconv"
	"syscall"
)

type term struct {
	cmd *exec.Cmd

	stdout io.ReadCloser
	stderr io.ReadCloser
	stdin  io.WriteCloser

	outByte chan byte
	errors  chan error
}

func (t *term) Close() error {
	killCmd := exec.Command("taskkill", "/F", "/T", "/PID", strconv.FormatInt(int64(t.cmd.Process.Pid), 10))
	err := killCmd.Run()

	if err != nil {
		return err
	}

	return err
}

func (t *term) Read(b []byte) (n int, err error) {
	select {
	case out := <-t.outByte:
		if out == '\n' {
			b[0] = '\r'
			b[1] = '\n'

			return 2, nil
		}

		b[0] = out
		return 1, nil
	case e := <-t.errors:
		return 0, e
	}
}

func (t *term) Write(b []byte) (n int, err error) {
	for i := 0; i < len(b); i++ {
		// Check for Ctrl-C and kill the child process
		if b[i] == 3 {
			t.stdin.Write([]byte{b[i]})
			err := t.Close()

			if err != nil {
				return 0, err
			}

			return 0, nil
		}

		// Check for the enter key pressed on vt-100 and add the
		//  extra LF after the CR
		if b[i] == '\r' {
			_, err := t.stdin.Write([]byte{'\r', '\n'})
			if err != nil {
				return 0, err
			}

			t.outByte <- '\n'
			continue
		}

		// Change the DEL to a BS
		if b[i] == 127 {
			_, err := t.stdin.Write([]byte{8})
			if err != nil {
				return 0, err
			}

			t.outByte <- 8
			continue
		}

		// Echo the characters back
		t.outByte <- b[i]
		_, err := t.stdin.Write([]byte{b[i]})
		if err != nil {
			return 0, err
		}
	}

	return len(b), nil
}

func (t *term) start() error {
	err := t.cmd.Start()
	if err != nil {
		return err
	}

	t.outByte = make(chan byte)
	t.errors = make(chan error)

	go func() {
		buf := make([]byte, 1024, 1024)

		for {
			n, err := t.stderr.Read(buf)

			if err != nil {
				t.errors <- err
				return
			}

			for i := 0; i < n; i++ {
				t.outByte <- buf[i]
			}
		}
	}()

	go func() {
		buf := make([]byte, 1024, 1024)

		for {
			n, err := t.stdout.Read(buf)

			if err != nil {
				t.errors <- err
				return
			}

			for i := 0; i < n; i++ {
				t.outByte <- buf[i]
			}
		}
	}()

	return nil
}

func start(c *exec.Cmd) (io.ReadCloser, io.WriteCloser, error) {
	c.SysProcAttr = &syscall.SysProcAttr{}
	//c.SysProcAttr.CreationFlags = 16 // CREATE_NEW_CONSOLE

	stdin, err := c.StdinPipe()

	if err != nil {
		return nil, nil, err
	}

	stdout, err := c.StdoutPipe()

	if err != nil {
		return nil, nil, err
	}

	stderr, err := c.StderrPipe()

	if err != nil {
		return nil, nil, err
	}

	t := &term{}
	t.cmd = c
	t.stderr = stderr
	t.stdout = stdout
	t.stdin = stdin

	err = t.start()
	if err != nil {
		return nil, nil, err
	}

	return t, t, nil
}

func createShellCommand() *exec.Cmd {
	return exec.Command("cmd")
}
