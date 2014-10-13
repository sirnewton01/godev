// Copyright 2014 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"

	"sync"
)

//type PersonaVerifyResult struct {
//	Audience string `json:"audience"`
//	Expires  int64  `json:"expires"`
//	Issuer   string `json:"issuer"`
//	Email    string `json:"email"`
//	Status   string `json:"status"`
//}

var (
	loginMutex sync.Mutex
)

func loginHandler(w http.ResponseWriter, r *http.Request) {
	// Login handling can be expensive and acts on behalf of un-authenticated users.
	// We will limit the number of logins to one at a time to avoid DOS situations.
	loginMutex.Lock()
	defer loginMutex.Unlock()

	// Persona is deprecated
	//	if hostName != loopbackHost && *remoteAccount != "" && strings.Index(r.URL.String(), "/persona") != -1 {
	//		// Mozilla Persona
	//		audience := "https://" + hostName + ":" + *port
	//
	//		assertion := r.FormValue("assertion")
	//		if assertion != "" {
	//			resp, err := http.PostForm("https://verifier.login.persona.org/verify", url.Values{"assertion": {assertion}, "audience": {audience}})
	//
	//			if err != nil {
	//				ShowError(w, 500, "Unable to process persona verifier response", err)
	//				return
	//			}
	//
	//			b, err := ioutil.ReadAll(resp.Body)
	//			if err != nil {
	//				ShowError(w, 500, "Unable to read persona verifier response", err)
	//				return
	//			}
	//
	//			verifyResult := &PersonaVerifyResult{}
	//			err = json.Unmarshal(b, verifyResult)
	//			if err != nil {
	//				ShowError(w, 500, "Unable to parse persona verifier response", err)
	//				return
	//			}
	//
	//			logger.Printf("PERSONA VERIFY: %v\n", verifyResult)
	//
	//			// For now we only trust the persona.org issuer
	//			// The email must be the account that the user provided us
	//			// The audience must be our service and not some other service
	//			// Finally, the verification must be "okay"
	//			if verifyResult.Email == *remoteAccount && verifyResult.Status == "okay" && verifyResult.Issuer == "login.persona.org" && verifyResult.Audience == audience {
	//				// If everything checks out then set the magic cookie to enable all service
	//				//  requests.
	//				cookie := &http.Cookie{Name: "MAGIC" + *port, Value: magicKey,
	//					Path: "/", Domain: hostName, MaxAge: 2000000,
	//					Secure: true, HttpOnly: false}
	//
	//				http.SetCookie(w, cookie)
	//				w.WriteHeader(200)
	//				return
	//			}
	//		}
	//
	//		http.Error(w, "Permission Denied", 401)
	//		return
	//	}

	// Check for a query parameter with the magic cookie
	// If we find it then we redirect the user's browser to set the
	//  cookie for all future requests.

	magicValues := r.URL.Query()["MAGIC"]
	if len(magicValues) == 1 && magicValues[0] == magicKey {
		// Redirect to the root URL setting the cookie
		// Cookie lasts for a couple of weeks
		cookie := &http.Cookie{Name: "MAGIC" + *port, Value: magicKey,
			Path: "/", Domain: hostName, MaxAge: 2000000,
			Secure: true, HttpOnly: false}

		http.SetCookie(w, cookie)
		http.Redirect(w, r, "/", 302)
		return
	}

	w.WriteHeader(200)
	w.Write([]byte(`{"ForceEmail":false,"CanAddUsers":false}`))
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	// Reset the cookie back to an empty value so that the user can
	//  no longer access the services from this browser.
	cookie := &http.Cookie{Name: "MAGIC" + *port, Value: "",
		Path: "/", Domain: hostName, MaxAge: 2000000,
		Secure: true, HttpOnly: false}

	http.SetCookie(w, cookie)
}
