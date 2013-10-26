// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"go/build"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	loopbackHost = "127.0.0.1"
	defaultPort  = "2022"
)

var (
	srcDirs                     = []string{}
	bundle_root_dir             = ""
	port                        = flag.String("port", defaultPort, "HTTP port number for the development server. (e.g. '2022')")
	debug                       = flag.Bool("debug", false, "Put the development server in debug mode with detailed logging.")
	logger          *log.Logger = nil
	hostName                    = loopbackHost
	magicKey                    = ""
	certFile                    = ""
	keyFile                     = ""
)

func init() {
	flag.Parse()

	if *debug {
		logger = log.New(os.Stdout, "godev", log.LstdFlags)
	} else {
		logger = log.New(ioutil.Discard, "godev", log.LstdFlags)
	}

	dirs := build.Default.SrcDirs()

	for i := len(dirs) - 1; i >= 0; i-- {
		srcDir := dirs[i]

		if !strings.HasPrefix(srcDir, runtime.GOROOT()) {
			srcDirs = append(srcDirs, srcDir)
		}

		if bundle_root_dir == "" {
			_, err := os.Stat(srcDir + "/github.com/sirnewton01/godev/bundles")

			if err == nil {
				bundle_root_dir = srcDir + "/github.com/sirnewton01/godev/bundles"
				break
			}
		}
	}

	if bundle_root_dir == "" {
		log.Fatal("GOPATH variable doesn't contain the godev source.\nPlease add the location to the godev source to the GOPATH.")
	}

	if os.Getenv("GOHOST") != "" {
		hostName = os.Getenv("GOHOST")

		certFile = os.Getenv("GOCERTFILE")
		keyFile = os.Getenv("GOKEYFILE")

		// If the host name is not loopback then we must use a secure connection
		//  with certificatns
		if certFile == "" || keyFile == "" {
			log.Fatal("When using a public port a certificate file (GOCERTFILE) and key file (GOKEYFILE) environment variables must be provided to secure the connection.")
		}

		// Initialize the random magic key for this session
		rand.Seed(time.Now().UTC().UnixNano())
		magicKey = strconv.FormatInt(rand.Int63(), 16)
	}
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

		if hostName != loopbackHost {
			// Check the magic cookie
			// Since redirection is not generally possible if the cookie is not
			//  present then we deny the request.
			cookie, err := req.Cookie("MAGIC" + *port)
			if err != nil || (*cookie).Value != magicKey {
				// Denied
				http.Error(writer, "Permission Denied", 403)
				return
			}
		}

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

func wrapFileServer(delegate http.Handler) handlerFunc {
	return func(writer http.ResponseWriter, req *http.Request) {
		if hostName != loopbackHost {
			// Check for the magic cookie
			cookie, err := req.Cookie("MAGIC" + *port)
			if err != nil || (*cookie).Value != magicKey {
				// Check for a query parameter with the magic cookie
				// If we find it then we redirect the user's browser to set the
				//  cookie for all future requests.
				// Otherwise we return permission denied.

				magicValues := req.URL.Query()["MAGIC"]
				if len(magicValues) < 1 || magicValues[0] != magicKey {
					// Denied
					http.Error(writer, "Permission Denied", 403)
					return
				}

				// Redirect to the base URL setting the cookie
				// Cookie lasts for a couple of weeks
				cookie := &http.Cookie{Name: "MAGIC" + *port, Value: magicKey,
					Path: "/", Domain: hostName, MaxAge: 2000000,
					Secure: true, HttpOnly: false}

				http.SetCookie(writer, cookie)

				urlWithoutQuery := req.URL
				urlWithoutQuery.RawQuery = ""

				http.Redirect(writer, req, urlWithoutQuery.String(), 302)
				return
			}
		}

		delegate.ServeHTTP(writer, req)
	}
}

func wrapWebSocket(delegate http.Handler) handlerFunc {
	return func(writer http.ResponseWriter, req *http.Request) {
		logger.Printf("WEBSOCK HANLDER: %v %v\n", req.Method, req.URL.Path)

		if hostName != loopbackHost {
			// Check the magic cookie
			// Since redirection is not generally possible if the cookie is not
			//  present then we deny the request.
			cookie, err := req.Cookie("MAGIC" + *port)
			if err != nil || (*cookie).Value != magicKey {
				// Denied
				http.Error(writer, "Permission Denied", 403)
				return
			}
		}

		delegate.ServeHTTP(writer, req)
	}
}

func main() {
	file, _ := os.Open(bundle_root_dir)
	bundleNames, err := file.Readdirnames(-1)

	// Sort the bundle names to guarantee that file overrides/shadowing happen in that order
	sort.Strings(bundleNames)

	bundleFileSystems := make([]http.FileSystem, len(bundleNames), len(bundleNames))
	for idx, bundleName := range bundleNames {
		bundleFileSystems[idx] = http.Dir(bundle_root_dir + "/" + bundleName + "/web")
		logger.Printf("Bundle path %v added\n", bundle_root_dir+"/"+bundleName+"/web")
	}

	cfs := chainedFileSystem{fs: bundleFileSystems}

	http.HandleFunc("/", wrapFileServer(http.FileServer(cfs)))
	http.HandleFunc("/workspace", wrapHandler(workspaceHandler))
	http.HandleFunc("/workspace/", wrapHandler(workspaceHandler))
	http.HandleFunc("/file", wrapHandler(fileHandler))
	http.HandleFunc("/file/", wrapHandler(fileHandler))
	http.HandleFunc("/prefs", wrapHandler(prefsHandler))
	http.HandleFunc("/prefs/", wrapHandler(prefsHandler))
	http.HandleFunc("/completion", wrapHandler(completionHandler))
	http.HandleFunc("/completion/", wrapHandler(completionHandler))
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
	http.HandleFunc("/debug/console/output/", wrapWebSocket(websocket.Handler(debugSocket)))
	http.HandleFunc("/test", wrapWebSocket(websocket.Handler(testSocket)))
	//	http.HandleFunc("/gitapi", wrapHandler(gitapiHandler))
	//	http.HandleFunc("/gitapi/", wrapHandler(gitapiHandler))

	if hostName == loopbackHost {
		fmt.Printf("http://%v:%v\n", hostName, *port)
		err = http.ListenAndServe(hostName+":"+*port, nil)
	} else {
		fmt.Printf("https://%v:%v/?MAGIC=%v\n", hostName, *port, magicKey)
		err = http.ListenAndServeTLS(hostName+":"+*port, certFile, keyFile, nil)
	}

	if err != nil {
		log.Fatal(err)
	}
}
