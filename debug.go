// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
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
	Cmd       []string
	Debug     bool
	Output    string
	Finished  bool
	process   *exec.Cmd
	stdin     io.Writer
}

// Internal process update object
type processUpdate struct {
	id         int
	moreOutput string
	finished   bool
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
				processIds[idx].Label = process.Cmd[0] +
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

			var cmd *exec.Cmd
			if request.Debug {
				cmd = exec.Command("gdb", request.Cmd[0])
			} else {
				cmd = exec.Command(gopath+"/bin/"+request.Cmd[0], request.Cmd[1:]...)
			}

			outpipe, err := cmd.StdoutPipe()
			errpipe, err := cmd.StderrPipe()
			inpipe, err := cmd.StdinPipe()

			// TODO check for errors during pipe opening

			cmd.Start()

			id := cmd.Process.Pid

			process := ProcessData{id, time.Now(), request.Cmd, request.Debug, "", false, cmd, inpipe}
			processes = append(processes, process)
			request.ResponseChannel <- id

			reader := func(pipe io.ReadCloser) {
				var buffer []byte = make([]byte, 1024, 1024)
				var n int = -1
				for err == nil {
					n, err = pipe.Read(buffer)

					update := processUpdate{id, string(buffer[:n]), false}
					processUpdates <- update
				}

				if err != nil && err != io.EOF {
					fmt.Printf("ERROR: %v\n", err.Error())
				}

				pipe.Close()
			}

			go reader(outpipe)
			go reader(errpipe)

			// This routine will wait until the command is finished and mark
			//  the process as completed
			go func() {
				cmd.Wait()

				processUpdates <- processUpdate{id, "", true}
			}()
		case request := <-si:
			pid := request.Id

			for idx, process := range processes {
				if process.Id == pid {
					process.stdin.Write(request.data)
					process.stdin.Write([]byte("\r\n"))
					process.Output = process.Output + string(request.data) + "\r\n"
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
					updateLength := len(update.moreOutput)

					if len(p.Output)+updateLength < bufferLimit {
						p.Output = p.Output + update.moreOutput
					} else if updateLength < bufferLimit {
						p.Output = p.Output[updateLength:] + update.moreOutput
					} else {
						p.Output = update.moreOutput[:bufferLimit]
					}

					p.Finished = update.finished

					// Replace the entry in the array with the updated output
					processes[idx] = p
					break
				}
			}
		}
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

		// TODO Make sure that the Cmd doesn't have any '/', '..' in it
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
	case req.Method == "GET" && len(pathSegs) == 2 && pathSegs[1] == "executables":
		binDir, err := os.Open(gopath + "/bin")
		if err != nil {
			ShowError(writer, 500, "No executables available", err)
			return true
		}

		executables, err := binDir.Readdirnames(-1)
		if err != nil {
			ShowError(writer, 500, "No executables available", err)
			return true
		}

		ShowJson(writer, 200, executables)
		return true
	}

	return false
}
