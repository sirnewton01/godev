// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"go/build"
	"path/filepath"
)

type Project struct {
	Id              string
	Location        string
	ContentLocation string
}

type Workspace struct {
	Id               string
	Directory        bool
	ChildrenLocation string
	Location         string
	LastModified     int64
	Name             string
	Projects         []Project
	Children         []FileDetails
}

type WorkspacesList struct {
	UserName   string
	Name       string
	Id         string
	Workspaces []Workspace
}

func getWsProjects() ([]Project, []FileDetails) {
	projects := make([]Project, 0, 0)
	children := make([]FileDetails, 0, 0)
	
	nameMap := make(map[string]string)
	
	for _,srcDir := range(srcDirs) {
		if strings.HasPrefix(srcDir, runtime.GOROOT()) {
			continue
		}
	
		filesDir := srcDir
	
		_, err := os.Stat(filesDir)
		if err != nil {
			logger.Printf("src directory doesn't exist in gopath at %v", filesDir)
			return []Project{}, []FileDetails{}
		}
	
		dir, err := os.Open(filesDir)
		if err != nil {
			logger.Printf("Unable to open src directory in gopath at %v", filesDir)
			return []Project{}, []FileDetails{}
		}
		names, err := dir.Readdirnames(-1)
	
		dir.Close()
		for _, name := range names {
			if strings.HasPrefix(name, ".") {
				continue
			}
			if nameMap[name] == "1" {
				continue
			}
			nameMap[name] = "1"
			
			fileinfo, err := os.Stat(filesDir + "/" + name)
			if err != nil {
				return []Project{}, []FileDetails{}
			}
			projectInfo := Project{Id: name, Location: "/workspace/project/" + name, ContentLocation: "/file/" + name}
			projects = append(projects, projectInfo)
	
			info := FileDetails{}
			info.Name = fileinfo.Name()
			info.Id = fileinfo.Name()
			info.Location = "/file/" + name
			info.Directory = fileinfo.IsDir()
			info.LocalTimeStamp = fileinfo.ModTime().Unix() * 1000
			info.ETag = strconv.FormatInt(fileinfo.ModTime().Unix(), 16)
			info.Parents = []FileDetails{} // TODO Calculate parent and put the object in here
			info.Attributes = make(map[string]bool)
			info.Attributes["ReadOnly"] = false
			executable := false
			mode := fileinfo.Mode()
			if (mode&os.ModePerm)&0111 != 0 {
				executable = true
			}
			info.Attributes["Executable"] = executable
			info.ChildrenLocation = "/file/" + name + "?depth=1"
			children = append(children, info)
		}
	}

	// Create a virtual project that represent the source code present at the GOROOT
	gorootPkgPath := runtime.GOROOT() + "/src/pkg"
	gorootInfo, err := os.Stat(gorootPkgPath)

	if err == nil {
		projectInfo := Project{Id: "GOROOT", Location: "/workspace/project/GOROOT", ContentLocation: "/file/GOROOT"}
		projects = append(projects, projectInfo)

		info := FileDetails{}
		info.Name = "GOROOT"
		info.Id = "GOROOT"
		info.Location = "/file/GOROOT"
		info.Directory = true
		info.LocalTimeStamp = gorootInfo.ModTime().Unix() * 1000
		info.ETag = strconv.FormatInt(gorootInfo.ModTime().Unix(), 16)
		info.Parents = []FileDetails{} // TODO
		info.Attributes = make(map[string]bool)
		info.Attributes["ReadOnly"] = true
		executable := false
		mode := gorootInfo.Mode()
		if (mode&os.ModePerm)&0111 != 0 {
			executable = true
		}
		info.Attributes["Executable"] = executable
		info.ChildrenLocation = "/file/GOROOT?depth=1"
		children = append(children, info)
	}

	return projects, children
}

func workspaceHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	numPathSegs := len(pathSegs)

	switch {
	case req.Method == "POST" && numPathSegs == 2:
		if !strings.HasPrefix(req.Header.Get("Content-Type"), "application/json") {
			ShowError(writer, 400, "No project name provided", nil)
			return true
		}

		var data map[string]string
		dec := json.NewDecoder(req.Body)
		err := dec.Decode(&data)
		if err != nil {
			ShowError(writer, 400, "Invalid request body", nil)
			return true
		}

		projectName, ok := data["Name"]
		if !ok {
			ShowError(writer, 400, "No project name provided in JSON object", nil)
			return true
		}

		//workspaceId := pathSegs[1]
		
		// New top-level folders (ie projects) go at the end of the GOPATH
		gopaths := filepath.SplitList(build.Default.GOPATH)		
		filesDir := gopaths[len(gopaths)-1] + "/src"

		projectPath := filesDir + "/" + projectName
		os.Mkdir(filesDir, 0700)
		err = os.Mkdir(projectPath, 0700)
		if err != nil {
			ShowError(writer, 500, "Unable to create project directory", err)
			return true
		}

		contentLocation := "/file/" + projectName
		location := "/workspace/project/" + projectName

		newProject := Project{Id: projectName, ContentLocation: contentLocation, Location: location}

		writer.Header().Set("Location", location)
		ShowJson(writer, 201, newProject)
		return true
	case req.Method == "GET" && numPathSegs < 3:
		workspaceList := WorkspacesList{Id: "anonymous", UserName: "anonymous", Name: "anonymous"}
		workspace := Workspace{Id: "1", Directory: true, ChildrenLocation: "/workspace/1", Location: "/workspace/1",
			LastModified: 1, Name: "Go Development"}
		workspace.Projects, workspace.Children = getWsProjects()
		workspaceList.Workspaces = []Workspace{workspace}
		etag := "1"
		writer.Header().Add("ETag", etag)

		if numPathSegs == 1 {
			// TODO Figure out if outputting all of the details (project, children) is too much for the plain workspace GET call
			ShowJson(writer, 200, workspaceList)
		} else {
			//workspaceId := pathSegs[1]
			ShowJson(writer, 200, workspace)
		}
		return true
	case req.Method == "POST" && numPathSegs == 1:
		ShowError(writer, 400, "Workspace POST not supported.", nil)
		return true
	case req.Method == "PUT" && numPathSegs == 2:
		ShowError(writer, 400, "Workspace PUT not supported.", nil)
		return true
	case req.Method == "DELETE" && numPathSegs == 3 && pathSegs[1] == "project":
		for _,srcDir := range(srcDirs) {
			_, err := os.Stat(srcDir+pathSegs[2])
			if err == nil {
				err = os.RemoveAll(srcDir+pathSegs[2])
				if err != nil {
					ShowError(writer, 400, "Project could not be removed", err)
					return true
				}
				
				ShowJson(writer, 200, "")
				return true
			}
		}
		
		ShowError(writer, 200, "Project could not be found. It was not removed.", nil)
		return true
	case req.Method == "DELETE" && numPathSegs == 2:
		ShowError(writer, 400, "Workspace deletion is not supported.", nil)
		return true
	}

	return false
}
