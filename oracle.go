// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type ImplementsResult struct {
	Implements Implements `json:"implements"`
}

type Implements struct {
	FromPtr []ImplementsType `json:"fromptr,omitempty"`
	To      []ImplementsType `json:"to,omitempty"`
}

type ImplementsType struct {
	Name       string `json:"name"`
	Pos        string `json:"pos"`
	LogicalPos string `json:"logicalPos"`
	Kind       string `json:"kind"`
}

type ReferrersResult struct {
	Referrers Referrers `json:"referrers"`
}

type Referrers struct {
	LogicalRefs []string `json:"logicalRefs"`
	Refs        []string `json:"refs"`
}

type CallersResult struct {
	Callers []Caller `json:"callers"`
}

type Caller struct {
	Desc       string `json:"desc"`
	Pos        string `json:"pos"`
	LogicalPos string `json:"logicalPos"`
}

type PeersResult struct {
	Peers Peers `json:"peers"`
}

type Peers struct {
	LogicalAllocs   []string `json:"logicalAllocs"`
	Allocs          []string `json:"allocs"`
	LogicalReceives []string `json:"logicalReceives"`
	Receives        []string `json:"receives"`
	LogicalSends    []string `json:"logicalSends"`
	Sends           []string `json:"sends"`
}

func getLogicalPos(localPos string) (logicalPos string) {
	for _, path := range append(srcDirs, filepath.Join(goroot, "/src/pkg")) {
		match := path
		if match[len(match)-1] != filepath.Separator {
			match = match + string(filepath.Separator)
		}

		if strings.HasPrefix(localPos, match) {
			logicalPos = localPos[len(match)-1:]

			if path == filepath.Join(goroot, "/src/pkg") {
				logicalPos = "/GOROOT" + logicalPos
			}

			// Replace any Windows back-slashes into forward slashes
			logicalPos = strings.Replace(logicalPos, "\\", "/", -1)
		}
	}

	if logicalPos == "" {
		logicalPos = localPos
	}

	return logicalPos
}

func oracleHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET" && pathSegs[2] == "implements":
		localFilePath := ""
		pathToMatch := "/" + strings.Join(pathSegs[4:], "/")
		pathToMatch = strings.Replace(pathToMatch, "/GOROOT/", "/", 1)

		for _, srcDir := range append(srcDirs, filepath.Join(goroot, "/src/pkg")) {
			path := filepath.Join(srcDir, pathToMatch)

			_, err := os.Stat(path)

			if err == nil {
				localFilePath = path
				break
			}
		}

		pos := req.URL.Query().Get("pos")
		pos = localFilePath + ":#" + pos

		scope := req.URL.Query().Get("scope")

		cmd := exec.Command("oracle", "-format=json", "-pos="+pos, "implements", scope)
		output, err := cmd.Output()

		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				// Executable was not found, inform the user
				ShowError(writer, 500, "Oracle tool failed or is not installed.", err)
				return true
			}

			// Tool returns no results basically
			writer.WriteHeader(204)
			return true
		}

		implements := &ImplementsResult{}
		json.Unmarshal(output, implements)

		for idx, _ := range implements.Implements.FromPtr {
			path := getLogicalPos(implements.Implements.FromPtr[idx].Pos)
			implements.Implements.FromPtr[idx].LogicalPos = path
		}

		for idx, _ := range implements.Implements.To {
			path := getLogicalPos(implements.Implements.To[idx].Pos)
			implements.Implements.To[idx].LogicalPos = path
		}

		ShowJson(writer, 200, implements)
		return true
	case req.Method == "GET" && pathSegs[2] == "referrers":
		localFilePath := ""
		pathToMatch := "/" + strings.Join(pathSegs[4:], "/")
		pathToMatch = strings.Replace(pathToMatch, "/GOROOT/", "/", 1)

		for _, srcDir := range append(srcDirs, filepath.Join(goroot, "/src/pkg")) {
			path := filepath.Join(srcDir, pathToMatch)

			_, err := os.Stat(path)

			if err == nil {
				localFilePath = path
				break
			}
		}

		pos := req.URL.Query().Get("pos")
		pos = localFilePath + ":#" + pos

		scope := req.URL.Query().Get("scope")

		cmd := exec.Command("oracle", "-format=json", "-pos="+pos, "referrers", scope)
		output, err := cmd.StdoutPipe()
		if err != nil {
			ShowError(writer, 500, "Error opening pipe", err)
			return true
		}
		defer output.Close()
		err = cmd.Start()

		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				// Executable was not found, inform the user
				ShowError(writer, 500, "Oracle tool failed or is not installed.", err)
				return true
			}

			// Tool returns no results basically
			writer.WriteHeader(204)
			return true
		}

		decoder := json.NewDecoder(output)
		referrers := &ReferrersResult{}
		decoder.Decode(referrers)

		cmd.Wait()

		for idx, _ := range referrers.Referrers.Refs {
			path := getLogicalPos(referrers.Referrers.Refs[idx])
			referrers.Referrers.LogicalRefs = append(referrers.Referrers.LogicalRefs, path)
		}

		ShowJson(writer, 200, referrers)
		return true
	case req.Method == "GET" && pathSegs[2] == "callers":
		localFilePath := ""
		pathToMatch := "/" + strings.Join(pathSegs[4:], "/")
		pathToMatch = strings.Replace(pathToMatch, "/GOROOT/", "/", 1)

		for _, srcDir := range append(srcDirs, filepath.Join(goroot, "/src/pkg")) {
			path := filepath.Join(srcDir, pathToMatch)

			_, err := os.Stat(path)

			if err == nil {
				localFilePath = path
				break
			}
		}

		pos := req.URL.Query().Get("pos")
		pos = localFilePath + ":#" + pos

		scope := req.URL.Query().Get("scope")

		cmd := exec.Command("oracle", "-format=json", "-pos="+pos, "callers", scope)
		output, err := cmd.StdoutPipe()
		if err != nil {
			ShowError(writer, 500, "Error opening pipe", err)
			return true
		}
		defer output.Close()
		err = cmd.Start()

		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				// Executable was not found, inform the user
				ShowError(writer, 500, "Oracle tool failed or is not installed.", err)
				return true
			}

			// Tool returns no results basically
			writer.WriteHeader(204)
			return true
		}

		decoder := json.NewDecoder(output)
		callers := &CallersResult{}
		decoder.Decode(callers)

		cmd.Wait()

		for idx, _ := range callers.Callers {
			callers.Callers[idx].LogicalPos = getLogicalPos(callers.Callers[idx].Pos)
		}

		ShowJson(writer, 200, callers)
		return true
	case req.Method == "GET" && pathSegs[2] == "peers":
		localFilePath := ""
		pathToMatch := "/" + strings.Join(pathSegs[4:], "/")
		pathToMatch = strings.Replace(pathToMatch, "/GOROOT/", "/", 1)

		for _, srcDir := range append(srcDirs, filepath.Join(goroot, "/src/pkg")) {
			path := filepath.Join(srcDir, pathToMatch)

			_, err := os.Stat(path)

			if err == nil {
				localFilePath = path
				break
			}
		}

		pos := req.URL.Query().Get("pos")
		pos = localFilePath + ":#" + pos

		scope := req.URL.Query().Get("scope")

		cmd := exec.Command("oracle", "-format=json", "-pos="+pos, "peers", scope)
		output, err := cmd.StdoutPipe()
		if err != nil {
			ShowError(writer, 500, "Error opening pipe", err)
			return true
		}
		defer output.Close()
		err = cmd.Start()

		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				// Executable was not found, inform the user
				ShowError(writer, 500, "Oracle tool failed or is not installed.", err)
				return true
			}

			// Tool returns no results basically
			writer.WriteHeader(204)
			return true
		}

		decoder := json.NewDecoder(output)
		peers := &PeersResult{}
		decoder.Decode(peers)

		cmd.Wait()

		for idx, _ := range peers.Peers.Allocs {
			path := getLogicalPos(peers.Peers.Allocs[idx])
			peers.Peers.LogicalAllocs = append(peers.Peers.LogicalAllocs, path)
		}

		for idx, _ := range peers.Peers.Sends {
			path := getLogicalPos(peers.Peers.Sends[idx])
			peers.Peers.LogicalSends = append(peers.Peers.LogicalSends, path)
		}

		for idx, _ := range peers.Peers.Receives {
			path := getLogicalPos(peers.Peers.Receives[idx])
			peers.Peers.LogicalReceives = append(peers.Peers.LogicalReceives, path)
		}

		ShowJson(writer, 200, peers)
		return true
	}

	return false
}
