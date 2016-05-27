// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"golang.org/x/net/websocket"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"go/build"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"net/http/cgi"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	loopbackHost     = "127.0.0.1"
	defaultPort      = "2022"
	maxRatePerSecond = 1000
)

var (
	goroot                       = ""
	srcDirs                      = []string{}
	bundle_root_dir              = ""
	godev_src_dir                = flag.String("srcdir", "", "Source directory of godev if not in the standard location in GOPATH")
	port                         = flag.String("port", defaultPort, "HTTP port number for the development server. (e.g. '2022')")
	debug                        = flag.Bool("debug", false, "Put the development server in debug mode with detailed logging.")
	remoteAccount                = flag.String("remoteAccount", "", "Email address of account that should be used to authenticate for remote access.")
	logger           *log.Logger = nil
	hostName                     = loopbackHost
	magicKey                     = ""
	certFile                     = ""
	keyFile                      = ""
	rateTracker                  = 0
	rateTrackerMutex sync.Mutex
	cfs              chainedFileSystem
)

func init() {
	flag.Parse()

	if *debug {
		logger = log.New(os.Stdout, "godev", log.LstdFlags)
	} else {
		logger = log.New(ioutil.Discard, "godev", log.LstdFlags)
	}

	goroot = runtime.GOROOT() + string(os.PathSeparator)

	dirs := build.Default.SrcDirs()

	for i := len(dirs) - 1; i >= 0; i-- {
		srcDir := dirs[i]

		if !strings.HasPrefix(srcDir, goroot) {
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

	// Try the location provided by the srcdir flag
	if bundle_root_dir == "" && *godev_src_dir != "" {
		_, err := os.Stat(*godev_src_dir + "/bundles")

		if err == nil {
			bundle_root_dir = *godev_src_dir + "/bundles"
		}
	}

	if bundle_root_dir == "" {
		log.Fatal("GOPATH variable doesn't contain the godev source.\nEither add the location to the godev source to your GOPATH or set the srcdir flag to the location.")
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

	// Clear out the rate tracker every second.
	// The rate tracking helps to prevent anyone from
	//   trying to brute force the magic key.
	go func() {
		for {
			<-time.After(1 * time.Second)
			rateTrackerMutex.Lock()
			rateTracker = 0
			rateTrackerMutex.Unlock()
		}
	}()
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
	writer.Header().Add("Content-Type", "application/json")
	writer.WriteHeader(int(httpCode))
	bytes, err := json.Marshal(obj)
	if err != nil {
		panic(err)
	}
	_, err = writer.Write(bytes)
	if err != nil {
		log.Printf("ERROR %v\n", err)
	}
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

type chainedFileSystem struct {
	mutex sync.Mutex
	data  *cfsData
}

type cfsData struct {
	fs         []http.FileSystem
	dirs       []string
	pluginKeys []string
	Plugins    map[string]bool `json:"/plugins"`
}

func (cfs chainedFileSystem) Open(name string) (http.File, error) {
	cfs.mutex.Lock()
	defer cfs.mutex.Unlock()

	data := cfs.data

	var lastIdx = len(data.fs) - 1

	for i := range data.fs {
		f, err := data.fs[i].Open(name)
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

func (cfs chainedFileSystem) checkNewPath(path string) {
	cfs.mutex.Lock()
	defer cfs.mutex.Unlock()

	data := cfs.data

	for _, existingPath := range data.dirs {
		if path == existingPath {
			break
		}
	}

	bundle_dir, _ := os.Open(path)
	subdirs, _ := bundle_dir.Readdirnames(-1)

	// There should only be one subdir with a unique name and a bundle html in it
	if len(subdirs) == 1 {
		_, err := os.Stat(filepath.Join(path, subdirs[0], "bundle.html"))

		if err == nil {
			pluginKey := subdirs[0] + "/bundle.html"
			_, exists := data.Plugins[pluginKey]
			if !exists {
				logger.Printf("ADDED BUNDLE %v\n", pluginKey)
				data.Plugins[pluginKey] = true
				data.pluginKeys = append(data.pluginKeys, pluginKey)
				data.dirs = append(data.dirs, path)
				data.fs = append(data.fs, http.Dir(path))
			}
		}
	}
}

func (cfs chainedFileSystem) cleanStalePaths() {
	cfs.mutex.Lock()
	defer cfs.mutex.Unlock()

	data := cfs.data

	newDirs := []string{}
	newFs := []http.FileSystem{}
	newKeys := []string{}

	for idx, _ := range data.dirs {
		_, err := os.Stat(data.dirs[idx])
		if err == nil {
			newDirs = append(newDirs, data.dirs[idx])
			newFs = append(newFs, data.fs[idx])
			newKeys = append(newKeys, data.pluginKeys[idx])
		} else {
			key := data.pluginKeys[idx]
			if key != "" {
				logger.Printf("REMOVED BUNDLE %v\n", key)
				delete(data.Plugins, key)
			}
		}
	}

	data.dirs = newDirs
	data.fs = newFs
	data.pluginKeys = newKeys
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
		logger.Printf("HANDLER: %v %v\n", req.Method, req.URL.Path)

		if hostName != loopbackHost {
			// Monitor the rate of requests
			rateTrackerMutex.Lock()
			if rateTracker > maxRatePerSecond {
				http.Error(writer, "Too many requests", 503)
				rateTrackerMutex.Unlock()
				return
			}
			rateTracker++
			rateTrackerMutex.Unlock()

			// Check the magic cookie
			// Since redirection is not generally possible if the cookie is not
			//  present then we deny the request.
			cookie, err := req.Cookie("MAGIC" + *port)
			if err != nil || (*cookie).Value != magicKey {
				// Denied
				http.Error(writer, "Permission Denied", 401)
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
		delegate.ServeHTTP(writer, req)
	}
}

func wrapWebSocket(delegate http.Handler) handlerFunc {
	return func(writer http.ResponseWriter, req *http.Request) {
		logger.Printf("WEBSOCK HANDLER: %v %v\n", req.Method, req.URL.Path)

		if hostName != loopbackHost {
			// Check the magic cookie
			// Since redirection is not generally possible if the cookie is not
			//  present then we deny the request.
			cookie, err := req.Cookie("MAGIC" + *port)
			if err != nil || (*cookie).Value != magicKey {
				// Denied
				http.Error(writer, "Permission Denied", 401)
				return
			}
		}

		delegate.ServeHTTP(writer, req)
	}
}

func defaultsHandler(writer http.ResponseWriter, req *http.Request) {
	writer.WriteHeader(200)
	// We expect that plugins can be added or removed at any time
	//  so the browser (or any proxy server) should not cache this information.
	writer.Header().Add("cache-control", "no-cache, no-store")

	cfs.mutex.Lock()
	b, err := json.Marshal(cfs.data)
	cfs.mutex.Unlock()

	if err != nil {
		ShowError(writer, 500, "Unable to marshal defaults", nil)
		return
	}

	writer.Write(b)
}

func bundleCgiHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	segments := strings.Split(req.URL.Path, "/")
	cgiProgram := segments[3]

	// This is to try to prevent someone from trying to execute arbitrary commands (e.g. ../../../bash)
	if strings.Index(cgiProgram, ".") != -1 {
		return false
	}

	// Check the bin directories of the gopaths to find a command that matches
	//  the command specified here.
	cmd := ""

	for _, srcDir := range srcDirs {
		c := filepath.Join(srcDir, "../bin/"+cgiProgram)
		_, err := os.Stat(c)
		if err == nil {
			cmd = c
			break
		}
	}

	if cmd != "" {
		logger.Printf("GODEV CGI CALL: %v\n", cmd)
		handler := cgi.Handler{}
		handler.Path = cmd
		handler.Args = []string{"-godev"}
		handler.Logger = logger
		handler.InheritEnv = []string{"PATH", "GOPATH"} // TODO Add GOCERTFILE, GOKEYFILE, ...
		handler.ServeHTTP(writer, req)
		return true
	} else {
		logger.Printf("GODEV CGI MISS: %v\n", cgiProgram)
	}

	return false
}

func main() {
	file, _ := os.Open(bundle_root_dir)
	bundleNames, err := file.Readdirnames(-1)

	// Sort the bundle names to guarantee that file overrides/shadowing happen in that order
	sort.Strings(bundleNames)

	bundleFileSystems := make([]http.FileSystem, len(bundleNames), len(bundleNames))
	bundleDirs := make([]string, len(bundleNames), len(bundleNames))
	pluginKeys := make([]string, len(bundleNames), len(bundleNames))
	for idx, bundleName := range bundleNames {
		bundleDirs[idx] = filepath.Clean(bundle_root_dir + "/" + bundleName + "/web")
		bundleFileSystems[idx] = http.Dir(bundleDirs[idx])
		pluginKeys[idx] = ""
		logger.Printf("Bundle path %v added\n", bundle_root_dir+"/"+bundleName+"/web")
	}

	cfs = chainedFileSystem{data: &cfsData{fs: bundleFileSystems, dirs: bundleDirs, pluginKeys: pluginKeys, Plugins: map[string]bool{
		"plugins/authenticationPlugin.html":        true,
		"plugins/fileClientPlugin.html":            true,
		"plugins/jslintPlugin.html":                true,
		"webtools/plugins/webToolsPlugin.html":     true,
		"javascript/plugins/javascriptPlugin.html": true,
		"edit/content/imageViewerPlugin.html":      true,
		"edit/content/jsonEditorPlugin.html":       true,
		"plugins/webEditingPlugin.html":            true,
		"plugins/helpPlugin.html":                  true,
		"plugins/languages/c/cPlugin.html":         true,
		"plugins/languages/docker/dockerPlugin.html":true,
		"plugins/languages/go/goPlugin.html":       true,
		"plugins/languages/markdown/markdownPlugin.html":true,
		"plugins/languages/xml/xmlPlugin.html":     true,
		"plugins/languages/yaml/yamlPlugin.html":   true,
		"plugins/pageLinksPlugin.html":             true,
		"plugins/preferencesPlugin.html":           true,
		"plugins/taskPlugin.html":                  true,
		"shell/plugins/shellPagePlugin.html":       true,

		"godev/go-godev.html": true,
	}}}

	// Poll the filesystem every so often to update the bundle caches
	go func() {
		for {
			for _, srcDir := range srcDirs {
				filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
					cfs.cleanStalePaths()
					if filepath.Base(path) == "godev-bundle" {
						cfs.checkNewPath(path)
					}

					return nil
				})
			}
			<-time.After(5 * time.Second)
		}
	}()

	http.HandleFunc("/defaults.pref", defaultsHandler)
	http.HandleFunc("/", wrapFileServer(http.FileServer(cfs)))
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/login/", loginHandler)
	http.HandleFunc("/logout", logoutHandler)
	http.HandleFunc("/logout/", logoutHandler)
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
	http.HandleFunc("/xfer", wrapHandler(xferHandler))
	http.HandleFunc("/xfer/", wrapHandler(xferHandler))
	http.HandleFunc("/go/build", wrapHandler(buildHandler))
	http.HandleFunc("/go/build/", wrapHandler(buildHandler))
	http.HandleFunc("/go/defs", wrapHandler(definitionHandler))
	http.HandleFunc("/go/defs/", wrapHandler(definitionHandler))
	http.HandleFunc("/go/fmt", wrapHandler(formatHandler))
	http.HandleFunc("/go/fmt/", wrapHandler(formatHandler))
	http.HandleFunc("/go/imports", wrapHandler(importsHandler))
	http.HandleFunc("/go/imports/", wrapHandler(importsHandler))
	http.HandleFunc("/go/outline", wrapHandler(outlineHandler))
	http.HandleFunc("/go/outline/", wrapHandler(outlineHandler))

	// Bundle Extensibility
	http.HandleFunc("/go/bundle-cgi", wrapHandler(bundleCgiHandler))
	http.HandleFunc("/go/bundle-cgi/", wrapHandler(bundleCgiHandler))

	// GODOC
	http.HandleFunc("/godoc/pkg", wrapHandler(docHandler))
	http.HandleFunc("/godoc/pkg/", wrapHandler(docHandler))
	http.HandleFunc("/godoc/src", wrapHandler(docHandler))
	http.HandleFunc("/godoc/src/", wrapHandler(docHandler))
	http.HandleFunc("/godoc/doc", wrapHandler(docHandler))
	http.HandleFunc("/godoc/doc/", wrapHandler(docHandler))
	http.HandleFunc("/godoc/search", wrapHandler(docHandler))
	http.HandleFunc("/godoc/search/", wrapHandler(docHandler))
	http.HandleFunc("/godoc/text", wrapHandler(docHandler))
	http.HandleFunc("/godoc/text/", wrapHandler(docHandler))

	http.HandleFunc("/debug", wrapHandler(debugHandler))
	http.HandleFunc("/debug/", wrapHandler(debugHandler))
	http.HandleFunc("/debug/socket", wrapWebSocket(websocket.Handler(debugSocket)))
	http.HandleFunc("/test", wrapWebSocket(websocket.Handler(testSocket)))
	http.HandleFunc("/blame", wrapHandler(blameHandler))
	http.HandleFunc("/blame/", wrapHandler(blameHandler))
	http.HandleFunc("/docker", wrapHandler(terminalHandler))
	http.HandleFunc("/docker/", wrapHandler(terminalHandler))
	http.HandleFunc("/docker/socket", wrapWebSocket(websocket.Handler(terminalSocket)))
	//	http.HandleFunc("/gitapi", wrapHandler(gitapiHandler))
	//	http.HandleFunc("/gitapi/", wrapHandler(gitapiHandler))

	if hostName == loopbackHost {
		fmt.Printf("http://%v:%v\n", hostName, *port)
		err = http.ListenAndServe(hostName+":"+*port, nil)
	} else {
		fmt.Printf("https://%v:%v/login?MAGIC=%v\n", hostName, *port, magicKey)
		err = http.ListenAndServeTLS(hostName+":"+*port, certFile, keyFile, nil)
	}

	if err != nil {
		log.Fatal(err)
	}
}
