// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
)

type FileDetails struct {
	ETag             string
	Id               string
	Name             string
	Location         string
	Directory        bool
	LocalTimeStamp   int64
	Parents          []FileDetails
	Attributes       map[string]bool
	ChildrenLocation string
	Children         interface{} `json:",omitempty"`
	Git              *GitMeta
}

type GitMeta struct {
	CloneLocation               string
	CommitLocation              string
	ConfigLocation              string
	DefaultRemoteBranchLocation string
	DiffLocation                string
	HeadLocation                string
	IndexLocation               string
	RemoteLocation              string
	StatusLocation              string
	TagLocation                 string
}

func fileHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST":
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""
		
		// Find a match in reverse GOPATH order
		for _,srcDir := range(srcDirs) {
			p := srcDir + fileRelPath
	
			_, err := os.Stat(p)
			if err == nil {
				filePath = p
				break
			}
		}
		
		if filePath == "" {
			ShowError(writer, 400, "Parent doesn't exist. The entry could be in the GOROOT and not on the GOPATH.", nil)
			return true
		}

		details := make(map[string]string)
		dec := json.NewDecoder(req.Body)
		err := dec.Decode(&details)

		if err != nil {
			ShowError(writer, 400, "Invalid input", err)
			return true
		}

		newName := details["Name"]
		if details["Directory"] == "true" {
			err = os.Mkdir(filePath+"/"+newName, 0700)
			if err != nil {
				ShowError(writer, 500, "Error creating directory", err)
				return true
			}
			writer.WriteHeader(201)
		} else {
			file, err := os.Create(filePath + "/" + newName)
			if err != nil {
				ShowError(writer, 500, "Error creating file", err)
				return true
			}
			file.Close()
			writer.WriteHeader(201)
		}
		return true
	case req.Method == "DELETE":
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""
		
		for _,srcDir := range(srcDirs) {
			p := srcDir + fileRelPath
			_,err := os.Stat(p)
			
			if err == nil {
				filePath = p
				break
			}
		}
		
		if filePath == "" {
			writer.WriteHeader(204)
			return true
		}

		err := os.RemoveAll(filePath)
		if err != nil {
			ShowError(writer, 500, "Unable to remove file", err)
			return true
		}
		writer.WriteHeader(204)
		return true
	case req.Method == "PUT":
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""
		
		for _,srcDir := range(srcDirs) {
			p := srcDir + fileRelPath
			
			_,err := os.Stat(p)
			if err == nil {
				filePath = p
				break
			}
		}
		
		if filePath == "" {
			writer.WriteHeader(404)
			return true
		}

		file, err := os.Create(filePath)
		if err != nil {
			ShowError(writer, 500, "Error writing to file", err)
			return true
		}

		_, err = io.Copy(file, req.Body)
		if err != nil {
			ShowError(writer, 500, "Error writing to file", err)
			return true
		}
		file.Close()

		fileinfo, err := os.Stat(filePath)
		if err != nil {
			ShowError(writer, 500, "Error accessing file", err)
			return true
		}

		info := FileDetails{}
		info.Name = fileinfo.Name()
		info.Id = fileinfo.Name()
		info.Location = fileRelPath
		info.Directory = fileinfo.IsDir()
		info.LocalTimeStamp = fileinfo.ModTime().Unix() * 1000
		info.ETag = strconv.FormatInt(fileinfo.ModTime().Unix(), 16)
		info.Parents = []FileDetails{} // TODO Calculate parent and put the object in here
		info.Attributes = make(map[string]bool)
		info.Attributes["ReadOnly"] = false
		info.Attributes["Executable"] = true // TODO Really calculate the execute bit
		info.ChildrenLocation = "/file" + fileRelPath + "?depth=1"

		ShowJson(writer, 200, info)
		return true
	case req.Method == "GET":
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""
		var err error
		var fileinfo os.FileInfo
		for _,srcDir := range(srcDirs) {
			p := srcDir + fileRelPath
			fileinfo,err = os.Stat(p)
			
			if err == nil {
				filePath = p
				break
			}
		}
		
		isgoroot := false

		if filePath == "" && len(pathSegs) >= 2 && pathSegs[1] == "GOROOT" {
			// Try again with the GOROOT
			filesDir := runtime.GOROOT() + "/src/pkg"
			fileRelPath := "/" + strings.Join(pathSegs[2:], "/")
			filePath = filesDir + fileRelPath
			isgoroot = true

			fileinfo, err = os.Stat(filePath)

			if err != nil {
				writer.WriteHeader(404)
				return true
			}
		} else if filePath == "" {
			writer.WriteHeader(404)
			return true
		}

		if req.URL.RawQuery == "" && !fileinfo.IsDir() {
			file, err := os.Open(filePath)
			if err != nil {
				ShowError(writer, 400, "Unable to open file", err)
				return true
			}
			writer.WriteHeader(200)
			_, err = io.Copy(writer, file)
			if err != nil {
				panic(err)
			}
			return true
		}

		info := FileDetails{}
		info.Name = fileinfo.Name()
		info.Id = fileinfo.Name()
		info.Location = "/file" + fileRelPath
		info.Directory = fileinfo.IsDir()
		info.ETag = strconv.FormatInt(fileinfo.ModTime().Unix(), 16)

		info.LocalTimeStamp = fileinfo.ModTime().Unix() * 1000

		parentPathSegs := pathSegs[:len(pathSegs)-1]
		info.Parents = make([]FileDetails, len(pathSegs)-2, len(pathSegs)-2)
		idx := 0
		for len(parentPathSegs) > 1 {
			parentInfo := FileDetails{}
			parentInfo.Name = parentPathSegs[len(parentPathSegs)-1]
			parentInfo.Id = parentPathSegs[len(parentPathSegs)-1]
			parentInfo.Location = "/" + strings.Join(parentPathSegs, "/")
			parentInfo.ChildrenLocation = parentInfo.Location + "?depth=1"
			parentInfo.Directory = true
			info.Parents[idx] = parentInfo

			idx++
			parentPathSegs = parentPathSegs[:len(parentPathSegs)-1]
		}

		info.Attributes = make(map[string]bool)
		info.Attributes["ReadOnly"] = isgoroot
		executable := false
		if (fileinfo.Mode()&os.ModePerm)&0111 != 0 {
			executable = true
		}
		info.Attributes["Executable"] = executable
		info.ChildrenLocation = "/file" + fileRelPath + "?depth=1"

		_, err = os.Stat(filePath + "/.git")
		if err == nil {
			// TODO handle more complicated branches and setup
			info.Git = &GitMeta{}
			info.Git.CloneLocation = "/gitapi/clone" + info.Location
			info.Git.CommitLocation = "/gitapi/commit/master" + info.Location
			info.Git.ConfigLocation = "/gitapi/config/clone" + info.Location
			info.Git.DefaultRemoteBranchLocation = "/gitapi/remote/origin/master" + info.Location
			info.Git.DiffLocation = "/gitapi/diff/Default" + info.Location
			info.Git.HeadLocation = "/gitapi/commit/HEAD" + info.Location
			info.Git.IndexLocation = "/gitapi/index" + info.Location
			info.Git.RemoteLocation = "/gitapi/remote" + info.Location
			info.Git.StatusLocation = "/gitapi/status" + info.Location
			info.Git.TagLocation = "/gitapi/tag" + info.Location
		}

		// TODO handle depths larger than 1
		if info.Directory /*&& strings.HasPrefix(req.URL.RawQuery, "depth" )*/ {
			dir, _ := os.Open(filePath)
			childInfos, err := dir.Readdir(-1)
			if err == nil {
				children := make([]FileDetails, len(childInfos), len(childInfos))

				for idx, fi := range childInfos {
					childInfo := FileDetails{}
					childInfo.Name = fi.Name()
					childInfo.Id = fi.Name()
					childInfo.Location = "/file" + fileRelPath + "/" + fi.Name()
					childInfo.Directory = fi.IsDir()
					childInfo.LocalTimeStamp = fi.ModTime().Unix() * 1000
					childInfo.Parents = []FileDetails{}
					childInfo.Attributes = make(map[string]bool)
					childInfo.Attributes["ReadOnly"] = isgoroot
					executable := false
					if (fi.Mode()&os.ModePerm)&0111 != 0 {
						executable = true
					}
					childInfo.Attributes["Executable"] = executable
					childInfo.ChildrenLocation = "/file" + fileRelPath + "/" + fi.Name() + "?depth=1"

					children[idx] = childInfo
				}

				info.Children = children
			}
		}

		ShowJson(writer, 200, info)
		return true
	}

	return false
}
