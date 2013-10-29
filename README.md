# Welcome to godev!

The aim of this project is to develop a premier Go language IDE hosted in a web interface. This was inspired by the way that the godoc tool uses a web UI instead of a traditional GUI.

There are certain advantages of a web UI in this case 


* Remote access through your web browser (no extra install required)
* OS independent GUI (Go has no standard cross-platform library)
* Hosted Go development environments


Where possible godev aims to reuse existing tools to provide an integrated experience. Not every tool needs to be installed in order to get a basic editing, 
navigation and execution environment. This helps to keep the IDE bloat to a minimum as well as promote existing standalone tools.

# The Plan

The initial sprint and prototype is complete. Future sprints will focus on improving breadth and depth of functionality.

Areas explored:

* Edit and Code Navigation
    + Use the Eclipse Orion project as a base
    + http://www.eclipse.org/orion
    + Syntax highlighting
    + File outline
    + Simple content assists
    + Markers for compile errors, todo comments, fixme comments
* Documentation
    + Go doc integration
* Build and Compile
    + Use the go build/go install commands to compile the code
    + Create console and markers for specific compile errors
* Run
    + Run and manage running Go process (output buffer, input, stop)
* Go test
    + Run a package's go test suite and report back results in a table/tree
* Contextual content assist
    + Content assists based on the return value of a function call
    + Content assists based on the other functions in the current file and local GOPATH packages 

New areas to explore:

* Git Integration
    + Manage push/pull/commit/add
* RTC SCM Integration
    + Manage pending changes, check-ins, deliveries

# Screenshots

![Screenshot1](https://hub.jazz.net/ccm01/service/com.ibm.team.workitem.service.internal.rest.IAttachmentRestService/repo/csid/Attachment/godev-screenshot1.png?itemId=_MwuvANtwEeKv4ph699mytQ)
Save the go file to see markers for compile errors

![Screenshot2](https://hub.jazz.net/ccm01/service/com.ibm.team.workitem.service.internal.rest.IAttachmentRestService/repo/csid/Attachment/godev-screenshot2.png?itemId=_Mx07MNtwEeKv4ph699mytQ)
Run and Debug programs from the Debug page
	
![Screenshot3](https://hub.jazz.net/ccm01/service/com.ibm.team.workitem.service.internal.rest.IAttachmentRestService/repo/csid/Attachment/godev-screenshot3.png?itemId=_MzNbQNtwEeKv4ph699mytQ)
Get content assistance using Ctrl-Space

![Screenshot4](https://hub.jazz.net/ccm01/service/com.ibm.team.workitem.service.internal.rest.IAttachmentRestService/repo/csid/Attachment/godev-screenshot4.png?itemId=_Mznq8NtwEeKv4ph699mytQ)
Use the shell to run go build or go install

![Screenshot5](https://hub.jazz.net/ccm01/service/com.ibm.team.workitem.service.internal.rest.IAttachmentRestService/repo/csid/Attachment/godev-screenshot5.png?itemId=_M0X44NtwEeKv4ph699mytQ)
Bring up godocs using the GoDoc page

# Videos
[Youtube](http://www.youtube.com/watch?feature=player_embedded&v=UTfHDbUUECg)
[Quick Start](http://www.youtube.com/watch?feature=player_embedded&v=U7RBElvfCkc)
[Sprint 4 Summary](http://youtube.com/watch?feature=player_embedded&v=WQe5nr1tq3k)

# Getting Started

The godev tool requires the Go SDK, which is freely available for download on golang.org 

To begin working with Go you first need to set up your GOPATH. This is a directory where all of your source code and binaries live. Pick an empty directory somewhere on your system and set the GOPATH environment variable with the path to this directory. For more details you can read the "How to Write Go Code" guide on golang.org. 

Get the source code from the latest release by running go get: "go get github.com/sirnewton01/godev"

Compile and install godev in your GOPATH by running go install: "go install github.com/sirnewton01/godev"

Run godev from the GOPATH/bin directory: "$GOPATH/bin/godev"

Open up your web browser and navigate to http://127.0.0.1:2022 Note that godev is only accessible from your local machine using the "127.0.0.1" address unless you set up Remote Access (more details below). You can begin a new godev project using the "New -> Folder" menu near the top of the screen.

If you have ideas for enhancements or find defects please Raise a Task on JazzHub (account required): [https://hub.jazz.net/ccm01/web/projects/sirnewton%20%7C%20godev#action=com.ibm.team.workitem.newWorkItem&type=task&ts=13725284879510](https://hub.jazz.net/ccm01/web/projects/sirnewton%20%7C%20godev#action=com.ibm.team.workitem.newWorkItem&type=task&ts=13725284879510)

Happy Go hacking! 

# Remote Access

Godev has remote access capabilities using your web browser and https. Access is controlled using a magic url known only to the person who launches the godev session. First, some setup is required to specify the fully qualified domain name of your system and establish a secure connection.

## Generating SSL/TLS keys

Godev uses HTTP over SSL/TLS, otherwise known as https, to encrypt information sent from the remote system and your local web browser. In order to set up the encryption both a certificate and encryption key is needed to establish the encrypted connection. You can use a tool like openssl or use a Go script included in every Go install to generate it.

To run the Go script to generate your certificates you can run the following command (replace / with \ on Windows, myhost.example.com with your fully qualified domain name):

$ go run /path/to/go/install/src/pkg/crypto/tls/generate _ cert.go -ca=true -duration=8760h0m0s -host=myhost.example.com

It is important to secure the certificates and keys with filesystem permissions so that others canot use them to intercept your communications.

$ chmod go-rwx cert.pem key.pem

## Setting Environment Variables

Your fully qualified domain name, certificate file and key file are provided to gdbg using the following environment variables:

$ export GOHOST=myhost.example.com
$ export GOCERTFILE=/path/to/my/cert.pem
$ export GOKEYFILE=/path/to/my/key.pem

These variables can be set in the same place you set your GOPATH and PATH variables so that they are set automatically every time you run the tool.

# Debugging

You can debug your applications within godev with the godbg application. Go get it so that you can debug inside your godev session.

$ go get github.com/sirnewton01/godbg

Debugging is accessed via the "Debug" section of godev. Pick your package, set the command-line arguments and click on the "Debug" button. Click on the URL to switch to the debugging session.

# Content Assist

Godev has an optional integration with the gocode tool to bring rich content assistance to the editor. Go get the latest go code source to activate the integration.

$ go get github.com/nsf/gocode

To activate content assistance you press Ctrl+Space in the editor to bring up a list of suggestions.
