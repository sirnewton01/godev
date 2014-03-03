// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"archive/zip"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type TransferInfo struct {
	IsZip    bool
	OsPath   string
	TmpPath  string
	Location string
	Source   string
}

var (
	counter   int
	transfers map[int]*TransferInfo
	lock      *sync.Mutex
)

func init() {
	counter = 0
	transfers = make(map[int]*TransferInfo)
	lock = &sync.Mutex{}
}

func xferHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST" && len(pathSegs) > 2:
		path := filepath.Clean(strings.Join(pathSegs[2:], "/"))
		containerPath := ""

		for _, srcDir := range srcDirs {
			p := filepath.Join(srcDir, path)
			_, err := os.Stat(p)
			if err == nil {
				containerPath = p
				break
			}
		}

		if containerPath == "" {
			ShowError(writer, 400, "Container not found or is in GOROOT", nil)
			return true
		}

		xferOption := req.Header.Get("X-Xfer-Options")
		tmpDir, err := ioutil.TempDir("", "godev-xfer")

		if err != nil {
			ShowError(writer, 500, "Unable to create temporary directory", err)
			return true
		}

		var info *TransferInfo = nil

		if xferOption == "" {
			// It's a zip upload
			info = &TransferInfo{true, containerPath, tmpDir, path, req.URL.Query().Get("source")}
		} else if xferOption == "raw" {
			// It's a raw file upload
			slug := req.Header.Get("Slug")
			source := req.URL.Query().Get("source")
			if slug == "" && source == "" {
				ShowError(writer, 400, "No file name is provided", nil)
				return true
			}

			if slug == "" {
				sourceParts := strings.Split(source, "/")
				slug = sourceParts[len(sourceParts)-1]
			}

			location := filepath.ToSlash(filepath.Join(path, slug))
			info = &TransferInfo{false, filepath.Join(containerPath, slug), tmpDir, location, source}
		} else {
			// Unknown transfer type
			ShowError(writer, 500, "Unknown transfer option "+xferOption, nil)
			return true
		}

		// Check if content is being transferred right away
		if req.Header.Get("X-Xfer-Content-Length") == "" {
			defer os.RemoveAll(info.TmpPath)
			return performTransfer(info, req, writer)
		}

		// Prepare for the content transfer in a separate request
		lock.Lock()
		defer lock.Unlock()

		counter = counter + 1
		transfers[counter] = info
		counterStr := strconv.FormatInt(int64(counter), 10)

		// Clear the transfer out after 10 minutes
		idx := counter
		go func() {
			<-time.After(10 * time.Minute)
			lock.Lock()
			info := transfers[idx]

			if info != nil {
				os.RemoveAll(info.TmpPath)
			}

			transfers[idx] = nil
			lock.Unlock()
		}()

		writer.Header().Set("Location", "/xfer/"+counterStr)
		writer.WriteHeader(200)

		return true
	case req.Method == "PUT" && len(pathSegs) == 2:
		idxStr := pathSegs[1]
		idx, err := strconv.ParseInt(idxStr, 10, 32)
		if err != nil {
			ShowError(writer, 400, "Invalid index", nil)
			return true
		}

		lock.Lock()
		info := transfers[int(idx)]
		transfers[int(idx)] = nil
		lock.Unlock()

		// Delete the temporary directory afterwards
		defer os.RemoveAll(info.TmpPath)

		if info == nil {
			ShowError(writer, 400, "Invalid transfer", nil)
			return true
		}

		return performTransfer(info, req, writer)
	}

	return false
}

func performTransfer(info *TransferInfo, req *http.Request, writer http.ResponseWriter) bool {
	transferPath := filepath.Join(info.TmpPath, "transfer")
	txFile, err := os.Create(transferPath)
	if err != nil {
		ShowError(writer, 400, "Unable to create temp file", err)
		return true
	}
	defer txFile.Close()

	// The content is in the body of this request
	if info.Source == "" {
		_, err = io.Copy(txFile, req.Body)
		if err != nil {
			ShowError(writer, 500, "Error making the transfer", err)
			return true
		}
		// The content is provided as a URL that we download
	} else {
		resp, err := http.Get(info.Source)
		if err != nil {
			ShowError(writer, 500, "Error accessing url "+info.Source, err)
			return true
		}
		defer resp.Body.Close()
		if resp.StatusCode > 300 {
			ShowError(writer, 500, "Error accessign url "+info.Source, err)
			return true
		}
		_, err = io.Copy(txFile, resp.Body)
		if err != nil {
			ShowError(writer, 500, "Error copying the contents from url "+info.Source, err)
			return true
		}
	}

	txFile.Close()

	// TODO handle byte range (partial) transfers

	if !info.IsZip {
		err = os.Rename(transferPath, info.OsPath)
		if err != nil {
			ShowError(writer, 500, "Error moving file into platce", err)
			return true
		}
	} else {
		rc, err := zip.OpenReader(transferPath)
		if err != nil {
			ShowError(writer, 400, "Zip cannot be opened or is not well-formed", err)
			return true
		}
		defer rc.Close()

		for _, zFile := range rc.File {
			osPath := filepath.Join(info.OsPath, zFile.Name)
			parentDir := filepath.Dir(osPath)

			// Make sure that the parent directories all exist for this new file
			err = os.MkdirAll(parentDir, 0700)
			if err != nil {
				ShowError(writer, 500, "Cannot make directories", err)
				return true
			}

			if zFile.FileInfo().IsDir() {
				_, err = os.Stat(osPath)
				if err == nil {
					// Already exists, proceed with the next entry
					continue
				}

				err = os.Mkdir(osPath, 0700)
				if err != nil {
					ShowError(writer, 500, "Cannot make directory", err)
					return true
				}
				continue
			}

			osFile, err := os.Create(filepath.Join(info.OsPath, zFile.Name))
			if err != nil {
				ShowError(writer, 500, "Cannot create file", err)
				return true
			}
			defer osFile.Close()

			content, err := zFile.Open()
			if err != nil {
				ShowError(writer, 500, "Error extracting zip", err)
				return true
			}
			defer content.Close()

			_, err = io.Copy(osFile, content)
			if err != nil {
				ShowError(writer, 500, "Error extracting zip", err)
				return true
			}

			content.Close()
			osFile.Close()
		}
	}

	details := &FileDetails{}
	fileinfo, err := os.Stat(info.OsPath)
	if err != nil {
		ShowError(writer, 500, "Error stating new file", err)
		return true
	}

	details.Name = fileinfo.Name()
	details.Id = fileinfo.Name()
	details.Location = info.Location
	details.Directory = fileinfo.IsDir()
	details.ETag = strconv.FormatInt(fileinfo.ModTime().Unix(), 16)
	details.LocalTimeStamp = fileinfo.ModTime().Unix() * 1000

	details.Attributes = make(map[string]bool)
	details.Attributes["ReadOnly"] = false
	details.Attributes["Executable"] = (fileinfo.Mode()&os.ModePerm)&0111 != 0

	// Symlink check
	fileinfo, err = os.Lstat(info.OsPath)
	if err != nil {
		ShowError(writer, 500, "Error accessing file", err)
		return true
	}

	details.Attributes["SymbolicLink"] = (fileinfo.Mode() & os.ModeSymlink) != 0
	details.ChildrenLocation = info.Location + "?depth=1"

	ShowJson(writer, 201, details)
	return true
}
