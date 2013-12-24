// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	unknown = iota
	git     = iota
	hg      = iota
	lscm    = iota
)

type Blame struct {
	AuthorName   string
	AuthorImage  string
	Message      string
	Name         string
	Time         string
	internalTime int64
	Shade        float32
	CommitLink   string
	Start        string
	End          string
}

type lscmAnnotateResult struct {
	Annotations []LscmAnnotation `json:"annotations"`
}

type LscmAnnotation struct {
	Author   string `json:"author"`
	Comment  string `json:"comment"`
	LineNo   string `json:"line-no"`
	Modified string `json:"modified"`
	Uuid     string `json:"uuid"`
	Workitem string `json:"workitem"`
}

func blameHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET" && pathSegs[1] == "file":
		localFilePath := ""

		for _, srcDir := range srcDirs {
			path := filepath.Join(srcDir, strings.Join(pathSegs[2:], "/"))

			_, err := os.Stat(path)

			if err == nil {
				localFilePath = path
				break
			}
		}

		// Determine what type of SCM system is in use (git, mercurial, or Jazz SCM)
		scmType := unknown
		for parentPath := localFilePath; filepath.Base(parentPath) != parentPath; parentPath = filepath.Dir(parentPath) {
			// Git
			gitMetaDir := filepath.Join(parentPath, ".git")
			_, err := os.Stat(gitMetaDir)

			if err == nil {
				scmType = git
				break
			}

			// Mercurial
			hgMetaDir := filepath.Join(parentPath, ".hg")
			_, err = os.Stat(hgMetaDir)

			if err == nil {
				scmType = hg
				break
			}

			// Jazz Source Control
			jazzMetaDir := filepath.Join(parentPath, ".jazz5")
			_, err = os.Stat(jazzMetaDir)

			if err == nil {
				scmType = lscm
				break
			}
		}

		if scmType == unknown {
			ShowError(writer, 400, "No recognized VCS system could be found for the provided file", nil)
			return true
		}

		blame := []Blame{}
		var err error = nil

		if scmType == git {
			blame, err = loadGitBlame(localFilePath)
			if err != nil {
				ShowError(writer, 400, "Unable to get git blame for file", err)
				return true
			}
		}

		if scmType == lscm {
			blame, err = loadLscmBlame(localFilePath)
			if err != nil {
				ShowError(writer, 400, "Unable to get jazz scm blame for file", err)
				return true
			}
		}

		if scmType == hg {
			blame, err = loadHgBlame(localFilePath)
			if err != nil {
				ShowError(writer, 400, "Unable to get mercurial blame for file", err)
				return true
			}
		}

		ShowJson(writer, 200, blame)
		return true
	}

	return false
}

func loadGitBlame(path string) (blames []Blame, err error) {
	cmd := exec.Command("git", "blame", path, "-p")
	// Start git in the directory so that it picks up the .git directory
	cmd.Dir = filepath.Dir(path)
	output, err := cmd.StdoutPipe()
	if err != nil {
		return blames, err
	}
	defer output.Close()
	err = cmd.Start()
	if err != nil {
		return blames, err
	}

	scanner := bufio.NewScanner(output)
	blame := Blame{}

	oldestTime := time.Now().Unix()
	newestTime := int64(0)

	commitMap := make(map[string]Blame)

	for scanner.Scan() {
		l := scanner.Text()
		parts := strings.Split(l, " ")

		// Blame Header
		if len(parts[0]) == 40 && len(parts) == 4 {
			newBlame := false

			// New blame section
			if blame.Name != parts[0] {
				if blame.Name != "" {
					// Clone any existing commit information from previous blames
					//  for this commit
					existingCommit := commitMap[blame.Name]
					if existingCommit.Name != "" {
						blame.AuthorName = existingCommit.AuthorName
						blame.Time = existingCommit.Time
						blame.internalTime = existingCommit.internalTime
						blame.Message = existingCommit.Message
					}

					blames = append(blames, blame)
					commitMap[blame.Name] = blame
				}

				blame = Blame{}
				// TODO figure out how to get per-author images from git
				blame.AuthorImage = "http://git-scm.com/favicon.ico"
				blame.Name = parts[0]
				blame.Start = parts[2]
				blame.End = parts[2]

				newBlame = true
			}

			// A second pass should resolve the shades
			blame.Shade = 0.0

			// Figure out the end of this blame
			end, err := strconv.ParseInt(blame.End, 10, 64)
			if err != nil {
				continue
			}

			additionalLines, err := strconv.ParseInt(parts[3], 10, 64)
			if err != nil {
				continue
			}

			end = end + additionalLines
			if newBlame {
				end = end - 1
			}
			blame.End = strconv.FormatInt(end, 10)
		} else if parts[0] == "author-time" && len(parts) == 2 {
			blame.internalTime, _ = strconv.ParseInt(parts[1], 10, 64)
			blame.Time = time.Unix(blame.internalTime, 0).Format(time.RFC1123)

			if blame.internalTime < oldestTime {
				oldestTime = blame.internalTime
			}

			if blame.internalTime > newestTime {
				newestTime = blame.internalTime
			}
			// Summaries can have spaces in them but the line must begin with "summary"
			//  and no tab
		} else if parts[0] == "summary" {
			blame.Message = l[8:]
		} else if parts[0] == "author" {
			blame.AuthorName = l[7:]
		}
	}

	cmd.Wait()

	if blame.Name != "" {
		// Clone any existing commit information from previous blames
		//  for this commit
		existingCommit := commitMap[blame.Name]
		if existingCommit.Name != "" {
			blame.AuthorName = existingCommit.AuthorName
			blame.Time = existingCommit.Time
			blame.internalTime = existingCommit.internalTime
			blame.Message = existingCommit.Message
		}
		blames = append(blames, blame)
	}

	for idx, _ := range blames {
		if oldestTime != newestTime {
			delta := float32(newestTime - oldestTime)

			blames[idx].Shade = float32(blames[idx].internalTime-oldestTime) / delta

			// Make sure that there is some kind of shading for the blame
			if blames[idx].Shade < 0.2 {
				blames[idx].Shade = 0.2
			}
		} else {
			// Give everything an average shading
			blames[idx].Shade = 0.5
		}
	}

	return blames, nil
}

func loadLscmBlame(path string) (blames []Blame, err error) {
	cmd := exec.Command("lscm", "annotate", path, "--json")
	// Start the lscm command in the directory so that it picks up the correct
	//  sandbox
	cmd.Dir = filepath.Dir(path)
	output, err := cmd.StdoutPipe()
	if err != nil {
		return blames, err
	}
	defer output.Close()
	err = cmd.Start()
	if err != nil {
		return blames, err
	}

	decoder := json.NewDecoder(output)
	annotations := &lscmAnnotateResult{}
	err = decoder.Decode(annotations)
	if err != nil {
		return blames, err
	}
	err = cmd.Wait()
	if err != nil {
		return blames, err
	}

	oldestTime := time.Now().Unix()
	newestTime := int64(0)

	for _, annotation := range annotations.Annotations {
		blame := Blame{}
		blame.AuthorName = annotation.Author

		// TODO perhaps a per-author image would be nice
		// This prevents the blame hover from producing a broken image icon
		blame.AuthorImage = "https://jazz.net/favicon.ico"

		// TODO Find the repo URL from the lscm status so that this works on any server
		blame.CommitLink = "https://hub.jazz.net/ccm01/resource/itemOid/com.ibm.team.scm.ChangeSet/" + annotation.Uuid

		blame.Start = annotation.LineNo
		blame.End = annotation.LineNo
		blame.Message = annotation.Comment

		if blame.Message == "" {
			blame.Message = "<No Comment>"
		}

		if annotation.Workitem != "" {
			blame.Message = "Work Item " + annotation.Workitem + " - " + blame.Message
		}

		blame.Name = annotation.Uuid

		// We will do a second pass for the shading
		blame.Shade = 0.0

		// Capture the oldest and newest change times
		t, err := time.Parse("2006-01-02 03:04 PM", annotation.Modified)
		if err == nil {
			blame.internalTime = t.Unix()

			if blame.internalTime < oldestTime {
				oldestTime = blame.internalTime
			}

			if blame.internalTime > newestTime {
				newestTime = blame.internalTime
			}
		}

		blame.Time = annotation.Modified

		blames = append(blames, blame)
	}

	for idx, _ := range blames {
		if oldestTime != newestTime {
			delta := float32(newestTime - oldestTime)

			blames[idx].Shade = float32(blames[idx].internalTime-oldestTime) / delta

			// Make sure that there is some kind of shading for the blame
			if blames[idx].Shade < 0.2 {
				blames[idx].Shade = 0.2
			}
		} else {
			// Give everything an average shading
			blames[idx].Shade = 0.5
		}
	}

	return blames, nil
}

func loadHgBlame(path string) (blames []Blame, err error) {
	cmd := exec.Command("hg", "blame", "-vduc", path)
	// Start git in the directory so that it picks up the .git directory
	cmd.Dir = filepath.Dir(path)
	output, err := cmd.StdoutPipe()
	if err != nil {
		return blames, err
	}
	defer output.Close()
	err = cmd.Start()
	if err != nil {
		return blames, err
	}

	scanner := bufio.NewScanner(output)

	oldestTime := time.Now().Unix()
	newestTime := int64(0)
	lineCount := 1

	csSummary := make(map[string]string)

	for scanner.Scan() {
		l := scanner.Text()

		idx := strings.Index(l, ">")

		authorInfo := l[:idx+1]
		authorInfo = strings.Trim(authorInfo, " ")
		l = l[idx+2:]

		changeSet := l[:12]
		date := l[13:43]

		blame := Blame{}
		// TODO tease out an author image somehow?
		blame.AuthorImage = "http://mercurial.selenic.com/favicon.ico"
		blame.Start = strconv.FormatInt(int64(lineCount), 10)
		blame.End = blame.Start
		blame.Name = changeSet

		authorInfo = authorInfo[:strings.Index(authorInfo, "<")]
		blame.AuthorName = authorInfo
		blame.Time = date
		t, err := time.Parse("Mon Jan 02 15:04:05 2006 -0700", date)
		if err == nil {
			blame.internalTime = t.Unix()

			if oldestTime > t.Unix() {
				oldestTime = t.Unix()
			}
			if newestTime < t.Unix() {
				newestTime = t.Unix()
			}
		}

		summary := csSummary[blame.Name]
		if summary == "" {
			// Retrieve the change set summary
			logCmd := exec.Command("hg", "log", "-r"+blame.Name)
			logCmd.Dir = filepath.Dir(path)
			b, err := logCmd.Output()
			if err == nil {
				output := string(b)

				idx := strings.Index(output, "\nsummary:")
				if idx != -1 {
					output = output[idx+9:]
					if idx != -1 {
						idx := strings.Index(output, "\n")
						output = output[0:idx]

						summary = strings.Trim(output, " ")
						csSummary[blame.Name] = summary
					}
				}
			}
		}
		blame.Message = summary

		blames = append(blames, blame)

		lineCount++
	}

	cmd.Wait()

	for idx, _ := range blames {
		if oldestTime != newestTime {
			delta := float32(newestTime - oldestTime)

			blames[idx].Shade = float32(blames[idx].internalTime-oldestTime) / delta

			// Make sure that there is some kind of shading for the blame
			if blames[idx].Shade < 0.2 {
				blames[idx].Shade = 0.2
			}
		} else {
			// Give everything an average shading
			blames[idx].Shade = 0.5
		}
	}

	return blames, nil
}
