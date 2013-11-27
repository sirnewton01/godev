// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
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
	case req.Method == "POST" && len(pathSegs) > 1:
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""

		// Find a match in reverse GOPATH order
		for _, srcDir := range srcDirs {
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

		createOptions := req.Header.Get("X-Create-Options")

		// This is a move
		if strings.Contains(createOptions, "move") {
			oldPathSegs := strings.Split(details["Location"], "/")
			// Two path segments are stripped off of the beginning (one for / and the other for "file")
			oldRelPath := strings.Join(oldPathSegs[2:], "/")
			oldPath := ""

			// Find a match in reverse GOPATH order
			for _, srcDir := range srcDirs {
				p := filepath.Join(srcDir, oldRelPath)

				_, err := os.Stat(p)
				if err == nil {
					oldPath = p
					break
				}
			}

			if oldPath == "" {
				ShowError(writer, 400, "Original doesn't exist", nil)
				return true
			}

			// Delete the destination if we don't have the no overwrite flag
			if !strings.Contains(createOptions, "no-overwrite") {
				err := os.RemoveAll(filePath + "/" + newName)

				if err != nil {
					ShowError(writer, 500, "Error overwriting file", err)
					return true
				}
			}

			err := os.Rename(oldPath, filePath+"/"+newName)

			if err != nil {
				ShowError(writer, 500, "Error moving file", err)
				return true
			}

			writer.WriteHeader(201)
		} else if strings.Contains(createOptions, "copy") {
			oldPathSegs := strings.Split(details["Location"], "/")
			// Two path segments are stripped off of the beginning (one for / and the other for "file")
			oldRelPath := strings.Join(oldPathSegs[2:], "/")
			oldPath := ""

			// Find a match in reverse GOPATH order
			for _, srcDir := range srcDirs {
				p := filepath.Join(srcDir, oldRelPath)

				_, err := os.Stat(p)
				if err == nil {
					oldPath = p
					break
				}
			}

			if oldPath == "" {
				ShowError(writer, 400, "Original not found so nothing copied", nil)
				return true
			}

			overwrite := !strings.Contains(createOptions, "no-overwrite")

			err = filepath.Walk(oldPath, func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return err
				}

				destRelPath, _ := filepath.Rel(oldPath, path)
				destPath := filepath.Join(filePath, newName, destRelPath)

				if !overwrite {
					_, statErr := os.Stat(destPath)
					if statErr == nil {
						// Already exists, return error
						return errors.New("File exists, can't overwrite")
					}
				}

				if info.IsDir() {
					err = os.Mkdir(destPath, info.Mode())
					if err != nil && overwrite {
						err = nil
					}
				} else {
					sourceFile, err := os.Open(path)
					if err != nil {
						return err
					}
					defer sourceFile.Close()

					destFile, err := os.Create(destPath)
					if err != nil {
						return err
					}
					defer destFile.Close()

					_, err = io.Copy(destFile, sourceFile)
				}

				return err
			})

			if err != nil {
				ShowError(writer, 500, "Error copying project", err)
				return true
			}
			writer.WriteHeader(201)
			return true
		} else if details["Directory"] == "true" {
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
	case req.Method == "DELETE" && len(pathSegs) > 1:
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""

		for _, srcDir := range srcDirs {
			p := srcDir + fileRelPath
			_, err := os.Stat(p)

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
	case req.Method == "PUT" && len(pathSegs) > 1:
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""

		for _, srcDir := range srcDirs {
			p := srcDir + fileRelPath

			_, err := os.Stat(p)
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
		info.Attributes["Executable"] = (fileinfo.Mode()&os.ModePerm)&0111 != 0

		// Symlink check
		fileinfo, err = os.Lstat(filePath)
		if err != nil {
			ShowError(writer, 500, "Error accessing file", err)
			return true
		}

		info.Attributes["SymbolicLink"] = (fileinfo.Mode() & os.ModeSymlink) != 0

		info.ChildrenLocation = "/file" + fileRelPath + "?depth=1"

		ShowJson(writer, 200, info)
		return true
	case req.Method == "GET" && len(pathSegs) > 1:
		fileRelPath := "/" + strings.Join(pathSegs[1:], "/")
		filePath := ""
		var err error
		var fileinfo os.FileInfo
		for _, srcDir := range srcDirs {
			p := srcDir + fileRelPath
			fileinfo, err = os.Stat(p)

			if err == nil {
				filePath = p
				break
			}
		}

		isgoroot := false

		if filePath == "" && len(pathSegs) >= 2 && pathSegs[1] == "GOROOT" {
			// Try again with the GOROOT
			filesDir := filepath.Join(goroot, "/src/pkg")
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
		info.Attributes["Executable"] = (fileinfo.Mode()&os.ModePerm)&0111 != 0

		// Symlink check
		fileinfo, err = os.Lstat(filePath)
		if err != nil {
			ShowError(writer, 500, "Error accessing file", err)
			return true
		}

		info.Attributes["SymbolicLink"] = (fileinfo.Mode() & os.ModeSymlink) != 0

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
			childNames, err := dir.Readdirnames(-1)
			if err == nil {
				children := make([]FileDetails, len(childNames), len(childNames))

				for idx, childName := range childNames {
					fi, err := os.Stat(filepath.Join(filePath, childName))
					if err != nil {
						continue
					}

					childInfo := FileDetails{}
					childInfo.Name = fi.Name()
					childInfo.Id = fi.Name()
					childInfo.Location = "/file" + fileRelPath + "/" + fi.Name()
					childInfo.Directory = fi.IsDir()
					childInfo.LocalTimeStamp = fi.ModTime().Unix() * 1000
					childInfo.Parents = []FileDetails{}
					childInfo.Attributes = make(map[string]bool)
					childInfo.Attributes["ReadOnly"] = isgoroot
					childInfo.Attributes["Executable"] = (fi.Mode()&os.ModePerm)&0111 != 0
					childInfo.ChildrenLocation = "/file" + fileRelPath + "/" + fi.Name() + "?depth=1"

					// Check for symbolic link
					fi, err = os.Lstat(filepath.Join(filePath, childName))
					if err == nil {
						childInfo.Attributes["SymbolicLink"] = (fi.Mode() & os.ModeSymlink) != 0
					}

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
