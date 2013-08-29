// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"errors"
	"flag"
	"go/build"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
)

var (
	bundle_root_dir             = ""
	gopath                      = ""
	port                        = flag.String("http", "127.0.0.1:2022", "HTTP port number for the development server. (e.g. '127.0.0.1:2022')")
	debug                       = flag.Bool("debug", false, "Put the development server in debug mode with detailed logging.")
	logger          *log.Logger = nil
)

func init() {
	flag.Parse()

	if *debug {
		logger = log.New(os.Stdout, "godev", log.LstdFlags)
	} else {
		logger = log.New(ioutil.Discard, "godev", log.LstdFlags)
	}

	if build.Default.GOPATH == "" {
		log.Fatal("GOPATH variable is not set.\nPlease set this environment variable to a suitable directory for Go development.\nSee http://golang.org/doc/code.html for more details.")
	} else {
		_, err := os.Stat(build.Default.GOPATH + "/src")
		if err != nil {
			err = os.MkdirAll(build.Default.GOPATH+"/src", 0755)
			if err != nil {
				log.Fatal("Could not create directory at GOPATH: %v", err.Error())
			} else {
				log.Printf("Created directory %v for GOPATH source", build.Default.GOPATH+"/src")
			}
		}
	}

	gopath = build.Default.GOPATH

	// The web bundles must come from the source in the GOPATH
	bundlesPath := gopath + "/src/github.com/sirnewton01/godev/bundles"

	_, err := os.Stat(bundlesPath)
	if err != nil {
		// It is possible that the bundles are in the godev directory directly underneath the src
		bundlesPath = gopath + "/godev/bundles"

		_, err = os.Stat(bundlesPath)
		if err != nil {
			log.Fatal("Could not locate godev bundle libraries in the GOPATH")
		}
	}

	bundle_root_dir = bundlesPath
}

const (
	SEV_ERR  = "Error"
	SEV_WARN = "Warning"
	SEV_INFO = "Info"
	SEV_CNCL = "Cancel"
	SEV_OK   = "Ok"
)

// Orion Status object
type Status struct {
	// One of SEV_ERR, SEV_WARN, SEV_INFO, SEV_CNCL, SEV_OK
	Severity        string
	HttpCode        uint
	Message         string
	DetailedMessage string
}

// Helper function to write an Orion-compatible error message with an optional error object
func ShowError(writer http.ResponseWriter, httpCode uint, message string, err error) {
	writer.Header().Add("Content-Type", "application/json")
	writer.WriteHeader(int(httpCode))
	errStr := ""
	if err != nil {
		errStr = err.Error()
	}
	status := Status{SEV_ERR, httpCode, message, errStr}
	bytes, err := json.Marshal(status)
	if err != nil {
		panic(err)
	}
	_, err = writer.Write(bytes)
	if err != nil {
		log.Printf("ERROR: %v\n", err)
	}
}

// Helper function to write an Orion-compatible JSON object
func ShowJson(writer http.ResponseWriter, httpCode uint, obj interface{}) {
	writer.WriteHeader(int(httpCode))
	writer.Header().Add("Content-Type", "application/json")
	bytes, err := json.Marshal(obj)
	if err != nil {
		panic(err)
	}
	_, err = writer.Write(bytes)
	if err != nil {
		log.Printf("ERROR %v\n", err)
	}
}

type chainedFileSystem struct {
	fs []http.FileSystem
}

func (cfs chainedFileSystem) Open(name string) (http.File, error) {
	var lastIdx = len(cfs.fs) - 1

	for i := range cfs.fs {
		f, err := cfs.fs[i].Open(name)
		if i == lastIdx && err != nil {
			logger.Printf("Miss: %v\n", name)
			return nil, err
		} else if err == nil {
			logger.Printf("Hit: %v\n", name)
			return noReaddirFile{f}, nil
		}
	}

	return nil, errors.New("Algorithm failure")
}

type noReaddirFile struct {
	http.File
}

func (file noReaddirFile) Readdir(count int) ([]os.FileInfo, error) {
	return nil, nil
}

type handlerFunc func(http.ResponseWriter, *http.Request)
type delegateFunc func(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool

func wrapHandler(delegate delegateFunc) handlerFunc {
	return func(writer http.ResponseWriter, req *http.Request) {
		logger.Printf("HANLDER: %v %v\n", req.Method, req.URL.Path)

		path := req.URL.Path
		pathSegs := strings.Split(path, "/")[1:]
		service := pathSegs[0]

		logger.Printf("PATH SEGMENTS: %v\n", pathSegs)
		logger.Printf("SERVICE: %v\n", service)

		handled := delegate(writer, req, path, pathSegs)

		if !handled {
			logger.Printf("Unrecognized service %v\n", req.URL)
			ShowError(writer, 404, "Unrecognized service "+req.Method+":"+req.URL.String(), nil)
		}
	}
}

func main() {
	file, _ := os.Open(bundle_root_dir)
	bundleNames, err := file.Readdirnames(-1)
	bundleFileSystems := make([]http.FileSystem, len(bundleNames), len(bundleNames))
	for idx, bundleName := range bundleNames {
		bundleFileSystems[idx] = http.Dir(bundle_root_dir + "/" + bundleName + "/web")
		logger.Printf("Bundle path %v added\n", bundle_root_dir+"/"+bundleName+"/web")
	}

	cfs := chainedFileSystem{fs: bundleFileSystems}

	http.Handle("/", http.FileServer(cfs))
	http.HandleFunc("/workspace", wrapHandler(workspaceHandler))
	http.HandleFunc("/workspace/", wrapHandler(workspaceHandler))
	http.HandleFunc("/file", wrapHandler(fileHandler))
	http.HandleFunc("/file/", wrapHandler(fileHandler))
	http.HandleFunc("/prefs", wrapHandler(prefsHandler))
	http.HandleFunc("/prefs/", wrapHandler(prefsHandler))
	//http.HandleFunc("/completion", wrapHandler(completionHandler))
	//http.HandleFunc("/completion/", wrapHandler(completionHandler))
	http.HandleFunc("/filesearch", wrapHandler(filesearchHandler))
	http.HandleFunc("/filesearch/", wrapHandler(filesearchHandler))
	http.HandleFunc("/go/build", wrapHandler(buildHandler))
	http.HandleFunc("/go/build/", wrapHandler(buildHandler))
	http.HandleFunc("/go/fmt", wrapHandler(formatHandler))
	http.HandleFunc("/go/fmt/", wrapHandler(formatHandler))
	http.HandleFunc("/go/doc", wrapHandler(docHandler))
	http.HandleFunc("/go/doc/", wrapHandler(docHandler))
	http.HandleFunc("/debug", wrapHandler(debugHandler))
	http.HandleFunc("/debug/", wrapHandler(debugHandler))
	http.Handle("/debug/console/output/", websocket.Handler(debugSocket))
	http.HandleFunc("/gitapi", wrapHandler(gitapiHandler))
	http.HandleFunc("/gitapi/", wrapHandler(gitapiHandler))

	log.Printf("Server started on port %v\n", *port)
	err = http.ListenAndServe(*port, nil)
	if err != nil {
		log.Fatal(err)
	}
}
