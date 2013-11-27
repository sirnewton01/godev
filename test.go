// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

type TestLog struct {
	Location string
	Line     int32
	Message  string
	Log      bool
}

type TestsComplete struct {
	Duration float32
	Complete bool
}

type TestStart struct {
	TestName string
	Start    bool
}

type TestFinished struct {
	TestName string
	Pass     bool
	Duration float32
	Finished bool
}

func testSocket(ws *websocket.Conn) {
	pkg := ws.Request().URL.Query().Get("pkg")

	if pkg == "" {
		ws.Write([]byte("\"No package provided\""))
		ws.Close()
		return
	}

	// Don't allow 'all' which will take way too long to run
	if pkg == "all" {
		ws.Write([]byte("\"Service doesn't support running tests against all packages\""))
		ws.Close()
		return
	}

	cmd := exec.Command("go", "test", pkg, "-test.v")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		ws.Write([]byte("\"Broken Pipe:" + err.Error() + "\""))
		ws.Close()
		return
	}
	err = cmd.Start()
	if err != nil {
		ws.Write([]byte("\"Go test failed to start: " + err.Error() + "\""))
		ws.Close()
		return
	}
	reader := bufio.NewReader(stdout)

	regex1 := regexp.MustCompile(`^(\w+) \(([0-9.]+) seconds\)$`)
	regex2 := regexp.MustCompile(`^(ok|FAIL)\s+\w+\s+([0-9.]+)s$`)
	regex3 := regexp.MustCompile(`^\t(\S+?):([0-9]+): (.*)$`)

	complete := TestsComplete{Complete: true}

	for {
		l, _, err := reader.ReadLine()

		if err != nil {
			break
		}

		line := string(l)

		// beginning of a test
		if strings.HasPrefix(line, "=== RUN ") {
			start := TestStart{line[8:], true}

			output, err := json.Marshal(start)
			if err == nil {
				ws.Write(output)
			}
			// end of a test (pass or fail)
		} else if strings.HasPrefix(line, "--- PASS: ") ||
			strings.HasPrefix(line, "--- FAIL: ") {
			info := line[10:]

			result := regex1.FindStringSubmatch(info)

			if result != nil {
				name := result[1]
				rawSeconds := result[2]

				seconds, err := strconv.ParseFloat(rawSeconds, 32)

				finished := TestFinished{name, strings.HasPrefix(line, "--- PASS: "), float32(seconds), true}

				output, err := json.Marshal(finished)
				if err == nil {
					ws.Write(output)
				}
			}
			// logging information
		} else if strings.HasPrefix(line, "\t") {
			result := regex3.FindStringSubmatch(line)

			if result != nil {
				file := result[1]
				line := result[2]
				message := result[3]

				lineNum, err := strconv.ParseInt(line, 10, 32)

				if err != nil {
					continue
				}

				location := ""
				// Check if this package is in the GOROOT
				_, err = os.Stat(filepath.Join(goroot, "/src/pkg", pkg))
				if err == nil {
					location = filepath.Join("/file/GOROOT", pkg, file)
				} else {
					location = filepath.Join("/file", pkg, file)
				}

				location = filepath.ToSlash(location)
				log := TestLog{Location: location, Line: int32(lineNum), Message: message, Log: true}

				output, err := json.Marshal(log)
				if err == nil {
					ws.Write(output)
				}
			}
			// end of tests
		} else if regex2.MatchString(line) {
			result := regex2.FindStringSubmatch(line)
			seconds, _ := strconv.ParseFloat(result[1], 32)
			complete.Duration = float32(seconds)
		}
	}

	cmd.Wait()

	output, err := json.Marshal(complete)
	if err != nil {
		ws.Write([]byte(`"` + err.Error() + `"`))
		ws.Close()
		return
	}
	ws.Write(output)
	ws.Close()
}
