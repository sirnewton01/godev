// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

/*import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type ConfigResponse struct {
	Children []ConfigItemInfo
	Type     string
}

type ConfigItemInfo struct {
	Key           string
	Value         string
	Location      string
	CloneLocation string
	Type          string
}

type BranchResponse struct {
	Children []BranchInfo
	Type     string
}

type BranchInfo struct {
	CloneLocation  string
	CommitLocation string
	Current        bool
	DiffLocation   string
	FullName       string
	HeadLocation   string
	LocalTimeStamp int64
	Location       string
	Name           string
	RemoteLocation []RemoteLocationInfo
	Type           string
}

type RemoteLocationInfo struct {
	Children      []RemoteBranchInfo
	CloneLocation string
	GitUrl        string
	Location      string
	Name          string
	Type          string
}

type RemoteBranchInfo struct {
	CloneLocation  string
	CommitLocation string
	DiffLocation   string
	FullName       string
	HeadLocation   string
	Id             string
	IndexLocation  string
	Location       string
	Name           string
	Type           string
}

type StatusInfo struct {
	Added           []string
	Changed         []string
	CloneLocation   string
	CommitLocation  string
	Conflicting     []string
	IndexLocation   string
	Location        string
	Missing         []string
	Modified        []string
	Removed         []string
	RepositoryState string
	Type            string
	Untracked       []string
}

type CloneInfo struct {
	BranchLocation  string
	CommitLocation  string
	ConfigLocation  string
	ContentLocation string
	DiffLocation    string
	GitUrl          *string
	HeadLocation    string
	IndexLocation   string
	Location        string
	Name            string
	RemoteLocation  string
	StatusLocation  string
	TagLocation     string
	Type            string
}

type CloneDataResponse struct {
	Children []CloneInfo
	Type     string
}

type PostCloneRequest struct {
	Name     string
	GitUrl   string
	Location string
}

type LocationData struct {
	Location string
}

type ResultData struct {
	Code     int
	HttpCode int
	JsonData LocationData
	Message  string
	Severity string
}

type PostCloneResponse struct {
	Location         string
	Result           ResultData
	Expires          int64  `json:"expires"`
	LengthComputable bool   `json:"lengthComputable"`
	Timestamp        int64  `json:"timestamp"`
	Type             string `json:"type"`
}

func gitapiHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST" && len(pathSegs) > 4 && pathSegs[1] == "commit":
		body := make(map[string]string)
		dec := json.NewDecoder(req.Body)
		err := dec.Decode(&body)

		if err != nil {
			ShowError(writer, 400, "Invalid input", err)
			return true
		}

		if body["New"] != "" {
			response := make(map[string]string)
			branch := pathSegs[2]
			branch = strings.Replace(branch, "%", "%25", -1)
			otherBranch := body["New"]

			response["Location"] = "/gitapi/commit/" + branch + ".." + otherBranch + "/" + strings.Join(pathSegs[3:], "/")

			writer.Header().Add("Location", response["Location"])

			ShowJson(writer, 200, response)
			return true
		}
	case req.Method == "GET" && len(pathSegs) > 4 && pathSegs[1] == "config":
		if pathSegs[2] == "clone" {
			response := ConfigResponse{}
			response.Type = "Config"

			loc := strings.Join(pathSegs[4:], "/")

			configCmd := exec.Command("git", "config", "-l")
			configCmd.Dir = gopath + "/src/" + loc
			configOutput, err := configCmd.Output()

			if err != nil {
				ShowError(writer, 500, "Git config command files", err)
				return true
			}

			configOutputStr := string(configOutput)
			configOutputStr = strings.Replace(configOutputStr, "\r", "", -1)
			entryList := strings.Split(configOutputStr, "\n")

			fmt.Printf("[%v]\n", loc)

			response.Children = make([]ConfigItemInfo, len(entryList)-1, len(entryList)-1)

			for idx, entry := range entryList[:len(entryList)-1] {
				info := ConfigItemInfo{}
				info.Type = "Config"

				keyValue := strings.Split(entry, "=")
				info.Key = keyValue[0]
				info.Value = keyValue[1]

				info.Location = "/gitapi/config/" + info.Key + "/clone/file/" + loc
				info.CloneLocation = "/gitapi/clone/file/" + loc

				response.Children[idx] = info
			}

			ShowJson(writer, 200, response)
			return true
		} else if pathSegs[3] == "clone" {
			//param := pathSegs[2]

		}
	case req.Method == "GET" && len(pathSegs) > 3 && pathSegs[1] == "branch":
		response := BranchResponse{Type: "Branch"}

		name := strings.Join(pathSegs[3:], "/")

		branchCmd := exec.Command("git", "branch")
		branchCmd.Dir = gopath + "/src/" + name
		branchOutput, err := branchCmd.Output()

		if err != nil {
			ShowError(writer, 500, "Git branch command failed", err)
			return true
		}

		branchOutputStr := string(branchOutput)
		branchOutputStr = strings.Replace(branchOutputStr, "\r", "", -1)
		branches := strings.Split(branchOutputStr, "\n")

		if branchOutputStr != "" {
			response.Children = make([]BranchInfo, len(branches)-1, len(branches)-1)

			for idx, branch := range branches[:len(branches)-1] {
				branchInfo := BranchInfo{Type: "Branch"}

				if strings.Contains(branch, "* ") {
					branchInfo.Current = true
					branch = strings.Replace(branch, "* ", "", 1)
				}

				branchInfo.CloneLocation = "/gitapi/clone/file/" + name

				showRefCmd := exec.Command("git", "show-ref", branch, "--heads")
				showRefCmd.Dir = gopath + "/src/" + name
				showRefOutput, err := showRefCmd.Output()

				if err != nil {
					ShowError(writer, 500, "Error running git show-ref command: "+string(branch), err)
					return true
				}

				branchFullName := string(showRefOutput)
				branchFullName = strings.Replace(branchFullName, "\n", "", 1)
				branchFullName = strings.Replace(branchFullName, "\r", "", 1)
				branchFullName = strings.Split(branchFullName, " ")[1]

				branchInfo.CommitLocation = "/gitapi/commit/" + branchFullName + "/file/" + name
				branchInfo.DiffLocation = "/gitapi/diff/" + branch + "/file/" + name
				branchInfo.FullName = branchFullName
				branchInfo.HeadLocation = "/gitapi/commit/HEAD/file/" + name
				branchInfo.Location = "/gitapi/branch/" + branch + "/file/" + name
				branchInfo.Name = branch

				showBranchCmd := exec.Command("git", "show", "--pretty=format:%at", "--summary", branch)
				showBranchCmd.Dir = gopath + "/src/" + name
				showBranch, err := showBranchCmd.Output()

				if err != nil {
					ShowError(writer, 500, "Error running git show command: "+string(showBranch), err)
					return true
				}

				ts := string(showBranch)
				ts = strings.Split(ts, "\n")[0]
				ts = strings.Replace(ts, "\r", "", -1)

				timestamp, err := strconv.ParseInt(ts, 10, 64)

				if err != nil {
					ShowError(writer, 500, "Error parsing git show command results", err)
					return true
				}

				branchInfo.LocalTimeStamp = timestamp * 1000

				remotesCmd := exec.Command("git", "remote")
				remotesCmd.Dir = gopath + "/src/" + name
				remotesOutput, err := remotesCmd.Output()

				if err != nil {
					ShowError(writer, 500, "Error running git remote command", err)
					return true
				}

				remotesStr := string(remotesOutput)
				remotesStr = strings.Replace(remotesStr, "\r", "", -1)
				remotes := strings.Split(remotesStr, "\n")

				branchInfo.RemoteLocation = make([]RemoteLocationInfo, len(remotes)-1, len(remotes)-1)
				for remoteIdx, remote := range remotes[:len(remotes)-1] {
					remoteLocInfo := RemoteLocationInfo{Type: "Remote"}

					remoteLocInfo.CloneLocation = "/gitapi/clone/file/" + name

					configCmd := exec.Command("git", "config", "--get", "remote."+remote+".url")
					configCmd.Dir = gopath + "/src/" + name
					configOutput, err := configCmd.Output()

					if err != nil {
						ShowError(writer, 500, "Error running git config command", err)
						return true
					}

					remoteLocInfo.GitUrl = string(configOutput)
					remoteLocInfo.Location = "/gitapi/remote/" + remote + "/file/" + name
					remoteLocInfo.Name = remote

					remoteBranchIdCmd := exec.Command("git", "branch", "-r", "-v", "--list", "--no-abbrev", remote+"/"+branch)
					remoteBranchIdCmd.Dir = gopath + "/src/" + name
					remoteBranchIdOut, err := remoteBranchIdCmd.Output()

					if err != nil {
						ShowError(writer, 500, "Error running git branch command", err)
						return true
					}

					remoteLocInfo.Children = make([]RemoteBranchInfo, 1, 1)
					remoteBranchInfo := RemoteBranchInfo{Type: "RemoteTrackingBranch"}
					remoteBranchInfo.Id = strings.Split(string(remoteBranchIdOut), " ")[2]
					remoteBranchInfo.CloneLocation = "/gitapi/clone/file/" + name
					remoteBranchInfo.CommitLocation = "/gitapi/commit/refs%252Fremotes%252F" + remote + "%252F" + branch + "/file/" + name
					remoteBranchInfo.DiffLocation = "/gitapi/diff/" + remote + "%252F" + branch + "/file/" + name
					remoteBranchInfo.FullName = "refs/remotes/" + remote + "/" + name
					remoteBranchInfo.HeadLocation = "/gitapi/commit/HEAD/file/" + name
					remoteBranchInfo.IndexLocation = "/gitapi/index/file/" + name
					remoteBranchInfo.Location = "/gitapi/remote/" + remote + "/" + branch + "/file/" + name
					remoteBranchInfo.Name = remote + "/" + branch

					remoteLocInfo.Children[0] = remoteBranchInfo

					branchInfo.RemoteLocation[remoteIdx] = remoteLocInfo
				}

				response.Children[idx] = branchInfo
			}
		} else {
			response.Children = make([]BranchInfo, 0, 0)
		}

		ShowJson(writer, 200, response)
		return true
	case req.Method == "GET" && len(pathSegs) > 3 && pathSegs[1] == "status":
		response := StatusInfo{}
		path := strings.Join(pathSegs[2:], "/")
		response.CloneLocation = "/gitapi/clone/" + path
		response.CommitLocation = "/gitapi/commit/HEAD/" + path
		response.IndexLocation = "/gitapi/index/" + path
		response.Location = "/gitapi/status/file/" + path
		response.RepositoryState = "SAFE"
		response.Type = "Status"

		response.Added = make([]string, 0, 0)
		response.Changed = make([]string, 0, 0)
		response.Conflicting = make([]string, 0, 0)
		response.Missing = make([]string, 0, 0)
		response.Modified = make([]string, 0, 0)
		response.Removed = make([]string, 0, 0)
		response.Untracked = make([]string, 0, 0)

		// FIXME invoke the correct git commands to produce the status output

		ShowJson(writer, 200, response)
		return true
	case req.Method == "GET" && len(pathSegs) > 3 && pathSegs[1] == "clone":
		response := CloneDataResponse{Type: "Clone"}

		gitfolders := []string{}

		if pathSegs[2] == "workspace" {
			srcDir, err := os.Open(gopath + "/src")
			if err != nil {
				ShowError(writer, 500, "Unable to open GOPATH src directory", err)
				return true
			}

			names, err := srcDir.Readdirnames(-1)
			if err != nil {
				ShowError(writer, 500, "Unable to read GOPATH src directory", err)
				return true
			}

			for _, name := range names {
				_, err := os.Stat(gopath + "/src/" + name + "/.git")
				if err == nil {
					gitfolders = append(gitfolders, name)
				}
			}
		} else if pathSegs[2] == "file" {
			gitfolders = append(gitfolders, strings.Join(pathSegs[3:], "/"))
		} else {
			// We don't know what to do with GET clone on something other than file or workspace
			return false
		}

		for _, name := range gitfolders {
			cmd := exec.Command("git", "config", "--get", "remote.origin.url")
			cmd.Dir = gopath + "/src/" + name
			originUrlOutput, _ := cmd.Output()

			// If the git config get command fails above it is likely due to the fact
			//  that there is no origin repo for this repo.

			cloneInfo := CloneInfo{}
			cloneInfo.BranchLocation = "/gitapi/branch/file/" + name
			cloneInfo.CommitLocation = "/gitapi/commit/file/" + name
			cloneInfo.ConfigLocation = "/gitapi/config/clone/file/" + name
			cloneInfo.ContentLocation = "/file/" + name
			cloneInfo.DiffLocation = "/gitapi/diff/Default/file/" + name
			if len(originUrlOutput) > 0 {
				url := string(originUrlOutput)
				cloneInfo.GitUrl = &url
			}
			cloneInfo.HeadLocation = "/gitapi/commit/HEAD/file/" + name
			cloneInfo.IndexLocation = "/gitapi/index/file/" + name
			cloneInfo.Location = "/gitapi/clone/file/" + name
			cloneInfo.Name = name
			cloneInfo.RemoteLocation = "/gitapi/remote/file/" + name
			cloneInfo.StatusLocation = "/gitapi/status/file/" + name
			cloneInfo.TagLocation = "/gitapi/tag/file/" + name
			cloneInfo.Type = "Clone"

			response.Children = append(response.Children, cloneInfo)
		}

		ShowJson(writer, 200, response)
		return true
	case req.Method == "POST" && len(pathSegs) == 3 && pathSegs[1] == "clone":
		request := PostCloneRequest{}
		dec := json.NewDecoder(req.Body)
		err := dec.Decode(&request)

		if err != nil {
			ShowError(writer, 400, "Invalid input", err)
			return true
		}

		// TODO honour the location property if it happens to point somewhere other than the workspace
		var name string
		if request.GitUrl != "" {
			urlSegments := strings.Split(request.GitUrl, "/")
			name = urlSegments[len(urlSegments)-1]
			name = strings.Replace(name, ".git", "", 1)
			cmd := exec.Command("git", "clone", request.GitUrl, gopath+"/src/"+name)
			err = cmd.Run()

			if err != nil {
				ShowError(writer, 500, "Git clone failed", err)
				return true
			}
		} else {
			name = request.Name
			cmd := exec.Command("git", "init", gopath+"/src/"+name)
			err = cmd.Run()

			if err != nil {
				ShowError(writer, 500, "Git init failed", err)
				return true
			}
		}

		response := PostCloneResponse{}
		response.Location = "/task/id/1"
		responseData := ResultData{}
		responseData.Code = 0
		responseData.HttpCode = 200
		locationData := LocationData{}
		locationData.Location = "/gitapi/clone/file/cmcgee/1" + name
		responseData.JsonData = locationData
		responseData.Message = "OK"
		responseData.Severity = "OK"
		response.Result = responseData
		response.Expires = time.Now().Add(10*time.Minute).Unix() * 1000
		response.Timestamp = time.Now().Unix() * 1000
		response.Type = "loadend"
		response.LengthComputable = false

		ShowJson(writer, 200, response)
		return true
	}

	return false
}
*/
