// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"fmt"
	"go/build"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strconv"
	"sync"
	"time"
)

const (
	bufferLimit  = 10000
	processLimit = 10
)

// The GetActiveProcesses channel is available to get a list of active process ID's.
// With a process ID you can retrieve the data about the process from the GetProcessData channel.
// Spawn a new process using the NewProcess channel.
var (
	GetActiveProcesses chan<- *ActiveProcessesRequest
	GetProcessData     chan<- *ProcessDataRequest
	NewProcess         chan<- *NewProcessRequest
	Kill               chan<- *KillRequest
	SendInput          chan<- *SendInputRequest
	Clear              chan<- *ClearRequest

	processUpdates chan processUpdate
)

// Request object to retrieve the list of all running process IDs
type ActiveProcessesRequest struct {
	ResponseChannel chan []struct {
		Label string
		Id    int
	}
}

// Request object to retrieve process data from GetActiveProcesses
type ProcessDataRequest struct {
	Id              int
	ResponseChannel chan *ProcessData
}

// Request object to start a new process managed by the system
type NewProcessRequest struct {
	// TODO Separate out package from arguments
	Cmd             []string
	Debug           bool
	ResponseChannel chan int
}

type KillRequest struct {
	Id int
}

type SendInputRequest struct {
	Id   int
	data []byte
}

type ClearRequest struct {
	ResponseChannel chan int
}

// All of the data about a running process
type ProcessData struct {
	Id        int
	StartTime time.Time
	// TODO Separate out package from arguments
	Cmd      []string
	Debug    bool
	output   chan string
	Finished bool
	process  *exec.Cmd
	stdin    io.Writer
}

// Internal process update object
type processUpdate struct {
	id       int
	finished bool
}

func init() {
	ap := make(chan *ActiveProcessesRequest)
	gpd := make(chan *ProcessDataRequest)
	np := make(chan *NewProcessRequest)
	si := make(chan *SendInputRequest)
	k := make(chan *KillRequest)
	cl := make(chan *ClearRequest)

	GetActiveProcesses = ap
	GetProcessData = gpd
	NewProcess = np
	SendInput = si
	Kill = k
	Clear = cl

	processUpdates = make(chan processUpdate)

	// Start a go routine to manage all of the active processes
	go manageProcesses(ap, gpd, np, si, k, cl)
}

// This is the main process manager rountine. Only one go routine is expected
//  to execute this function.
func manageProcesses(ap chan *ActiveProcessesRequest, gpd chan *ProcessDataRequest, np chan *NewProcessRequest, si chan *SendInputRequest, k chan *KillRequest, cl chan *ClearRequest) {
	processes := make([]ProcessData, 0, 0)

	for {
		select {
		case request := <-ap:
			processIds := make([]struct {
				Label string
				Id    int
			}, len(processes), len(processes))
			for idx, process := range processes {
				processIds[idx].Id = process.Id

				_, cmdName := filepath.Split(process.Cmd[0])

				processIds[idx].Label = cmdName +
					" <" + process.StartTime.Format(time.UnixDate) +
					"> (" + strconv.FormatInt(int64(process.Id), 10) + ")"
			}
			request.ResponseChannel <- processIds
		case request := <-gpd:
			var matchingProcess *ProcessData = nil
			for _, process := range processes {
				if process.Id == request.Id {
					matchingProcess = &process
					break
				}
			}

			request.ResponseChannel <- matchingProcess
		case request := <-np:
			if len(processes) > processLimit {
				request.ResponseChannel <- -1
			}

			cmd := exec.Command(request.Cmd[0], request.Cmd[1:]...)

			id := -1

			inpipe, _ := cmd.StdinPipe()

			wg := sync.WaitGroup{}
			wg.Add(1)
			wg2 := sync.WaitGroup{}
			wg2.Add(1)

			outputChannel := make(chan string)

			reader := func() {
				pipe, err := cmd.StdoutPipe()
				cmd.StderrPipe()

				wg.Done()
				wg2.Wait()

				var buffer []byte = make([]byte, 1024, 1024)
				var n int = -1
				for err == nil {
					n, err = pipe.Read(buffer)

					outputChannel <- string(buffer[:n])
				}

				close(outputChannel)

				if err != nil && err != io.EOF {
					fmt.Printf("ERROR: %v\n", err.Error())
				}

				processUpdates <- processUpdate{id, true}
			}

			go reader()

			wg.Wait()
			cmd.Start()
			id = cmd.Process.Pid
			process := ProcessData{id, time.Now(), request.Cmd, request.Debug, outputChannel, false, cmd, inpipe}
			processes = append(processes, process)
			request.ResponseChannel <- id
			wg2.Done()
		case request := <-si:
			pid := request.Id

			for idx, process := range processes {
				if process.Id == pid {
					process.stdin.Write(request.data)
					process.stdin.Write([]byte("\r\n"))
					processes[idx] = process
					break
				}
			}
		case request := <-k:
			pid := request.Id

			for _, process := range processes {
				if process.Id == pid {
					process.process.Process.Kill()
					break
				}
			}
		case request := <-cl:
			newProcesses := []ProcessData{}

			for _, process := range processes {
				if !process.Finished {
					newProcesses = append(newProcesses, process)
				}
			}

			processes = newProcesses
			request.ResponseChannel <- len(newProcesses)
		case update := <-processUpdates:
			for idx, p := range processes {
				if p.Id == update.id {
					p.Finished = update.finished
					if update.finished {
						p.process.Wait()
					}

					// Replace the entry in the array with the updated output
					processes[idx] = p
					break
				}
			}
		}
	}
}

func debugSocket(ws *websocket.Conn) {
	_, pidStr := path.Split(ws.Request().URL.Path)
	pid, err := strconv.ParseInt(pidStr, 10, 64)

	if err != nil {
		ws.Write([]byte("Process not found or is finished"))
		ws.Close()
		return
	}

	response := make(chan *ProcessData)
	GetProcessData <- &ProcessDataRequest{int(pid), response}
	procData := <-response

	if procData == nil {
		ws.Write([]byte("Process not found or is finished"))
		ws.Close()
		return
	}

	for {
		buffer := <-procData.output

		if buffer == "" {
			ws.Write([]byte(""))
			ws.Close()
			break
		}

		ws.Write([]byte(buffer))
	}
}

func debugHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST" && len(pathSegs) == 1:
		request := NewProcessRequest{Debug: false}
		dec := json.NewDecoder(req.Body)
		err := dec.Decode(&request)

		if err != nil {
			ShowError(writer, 400, "Decoder error", err)
			return true
		}

		rungodbg := false

		if request.Debug {
			godbgtest := exec.Command("godbg")
			err := godbgtest.Run()
			if err == nil {
				rungodbg = true
			}
		}

		// build or install the command to make sure it can be compiled
		//  and is up-to-date. Godbg will do its own installation afterwards
		//  but this is a good check here.
		installCmd := exec.Command("go", "install", request.Cmd[0])
		err = installCmd.Run()
		if err != nil {
			ShowError(writer, 400, "Error installing command.", err)
			return true
		}

		if !rungodbg {
			commandName := filepath.Base(request.Cmd[0])
			gopaths := filepath.SplitList(build.Default.GOPATH)
			foundCommand := false

			for _, gopath := range gopaths {
				_, err := os.Stat(gopath + "/bin/" + commandName)
				if err == nil {
					request.Cmd[0] = gopath + "/bin/" + commandName
					foundCommand = true
					break
				}
			}

			if !foundCommand {
				ShowError(writer, 400, "Command not found in any GOPATH", nil)
				return true
			}
		} else {
			newCmd := []string{"godbg", "-openBrowser=false"}
			newCmd = append(newCmd, request.Cmd...)
			request.Cmd = newCmd
		}

		request.ResponseChannel = make(chan int, 1)
		NewProcess <- &request
		pid := <-request.ResponseChannel

		if pid == -1 {
			ShowError(writer, 400, "Too many processes", nil)
			return true
		}

		ShowJson(writer, 200, pid)
		return true
	case req.Method == "POST" && len(pathSegs) == 2 && pathSegs[1] == "clear":
		request := ClearRequest{}
		request.ResponseChannel = make(chan int)
		Clear <- &request
		_ = <-request.ResponseChannel
		ShowJson(writer, 200, "")
		return true
	case req.Method == "POST" && len(pathSegs) == 3 && pathSegs[1] == "kill":
		pidStr := pathSegs[2]
		pid, err := strconv.ParseInt(pidStr, 10, 32)

		if err != nil {
			ShowError(writer, 400, "Bad process id", err)
			return true
		}
		request := KillRequest{int(pid)}
		Kill <- &request

		ShowJson(writer, 200, "")
		return true
	case req.Method == "POST" && len(pathSegs) == 3 && pathSegs[1] == "input":
		pidStr := pathSegs[2]
		pid, err := strconv.ParseInt(pidStr, 10, 32)

		if err != nil {
			ShowError(writer, 400, "Bad process id", err)
			return true
		}

		buffer := make([]byte, 1024, 1024)
		n, err := req.Body.Read(buffer)
		if err != nil {
			ShowError(writer, 400, "Input too large or error reading request body", err)
			return true
		}

		request := SendInputRequest{int(pid), buffer[:n]}
		SendInput <- &request

		ShowJson(writer, 200, "")
		return true
	case req.Method == "GET" && len(pathSegs) == 1:
		request := ActiveProcessesRequest{}
		request.ResponseChannel = make(chan []struct {
			Label string
			Id    int
		})
		GetActiveProcesses <- &request
		processes := <-request.ResponseChannel

		ShowJson(writer, 200, processes)
		return true
	case req.Method == "GET" && len(pathSegs) == 3 && pathSegs[1] == "pid":
		pidStr := pathSegs[2]
		pid, err := strconv.ParseInt(pidStr, 10, 32)

		if err != nil {
			ShowError(writer, 400, "Bad process id", err)
			return true
		}

		request := ProcessDataRequest{}
		request.Id = int(pid)
		request.ResponseChannel = make(chan *ProcessData)
		GetProcessData <- &request
		processData := <-request.ResponseChannel

		ShowJson(writer, 200, processData)
		return true
	case req.Method == "GET" && len(pathSegs) == 2 && pathSegs[1] == "commands":
		commands := []string{}

		srcDirs := build.Default.SrcDirs()

		for _, srcDir := range srcDirs {
			// Skip stuff that is in the GOROOT
			if filepath.HasPrefix(srcDir, runtime.GOROOT()) {
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
