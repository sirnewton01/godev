// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"golang.org/x/net/websocket"
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

type RaceDetectorDetails struct {
	Entries []RaceDetectorEntry
}

type RaceDetectorEntry struct {
	Summary  string
	Location []string
}

func testSocket(ws *websocket.Conn) {
	pkg := ws.Request().URL.Query().Get("pkg")
	race := ws.Request().URL.Query().Get("race")

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
	if race == "true" {
		cmd = exec.Command("go", "test", "-race", pkg, "-test.v")
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		ws.Write([]byte("\"Broken Pipe:" + err.Error() + "\""))
		ws.Close()
		return
	}

	wg1 := sync.WaitGroup{}
	wg1.Add(1)
	wg2 := sync.WaitGroup{}
	wg2.Add(1)
	raceDetectorChannel := make(chan []RaceDetectorDetails)

	go func() {
		races := make([]RaceDetectorDetails, 0, 1)

		stderr, err := cmd.StderrPipe()
		wg1.Done()
		if err != nil {
			raceDetectorChannel <- races
			return
		}
		wg2.Wait()

		errReader := bufio.NewReader(stderr)

		var raceDetails *RaceDetectorDetails = nil
		var raceEntry *RaceDetectorEntry = nil

		for {
			l, _, err := errReader.ReadLine()

			if err != nil {
				break
			}

			line := string(l)

			if line == "WARNING: DATA RACE" {
				raceDetails = &RaceDetectorDetails{}
			} else if line != "==================" && !strings.HasPrefix(line, " ") && len(line) > 0 && raceDetails != nil {
				if raceEntry != nil {
					raceDetails.Entries = append(raceDetails.Entries, *raceEntry)
				}
				raceEntry = &RaceDetectorEntry{}
				raceEntry.Summary = line
			} else if strings.HasPrefix(line, "      ") && raceEntry != nil {
				location := strings.Split(line[6:], " ")[0]
				location = getLogicalPos(location)
				raceEntry.Location = append(raceEntry.Location, location)
			} else if line == "==================" && raceDetails != nil {
				if raceEntry != nil {
					raceDetails.Entries = append(raceDetails.Entries, *raceEntry)
					raceEntry = nil
				}
				races = append(races, *raceDetails)
				raceDetails = nil
			}
		}

		if raceDetails != nil && raceEntry != nil {
			raceDetails.Entries = append(raceDetails.Entries, *raceEntry)
		}

		raceDetectorChannel <- races
	}()

	wg1.Wait()
	err = cmd.Start()
	wg2.Done()
	if err != nil {
		ws.Write([]byte("\"Go test failed to start: " + err.Error() + "\""))
		ws.Close()
		return
	}
	reader := bufio.NewReader(stdout)

	regex1 := regexp.MustCompile(`^(\w+) \(([0-9.]+) seconds\)$`)
	regex2 := regexp.MustCompile(`^(ok|FAIL)\s+\w+\s+([0-9.]+)s$`)
	regex3 := regexp.MustCompile(`^\t(\S+?):([0-9]+): (.*)$`)

	// TODO parse stack traces to report back through the socket

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

	output, err = json.Marshal(<-raceDetectorChannel)
	if err != nil {
		ws.Write([]byte(`"` + err.Error() + `"`))
		ws.Close()
		return
	}
	ws.Write(output)

	ws.Close()
}
