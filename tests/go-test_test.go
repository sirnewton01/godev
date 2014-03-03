package main

import (
	"fmt"
	"testing"
	"time"
)

func Test1(t *testing.T) {
	t.Logf("Here is some info: %v", "info")
	t.Errorf("An error has occurred")
}

func TestRace(t *testing.T) {
	done := make(chan bool)
	m := make(map[string]string)
	m["name"] = "world"
	go func() {
		m["name"] = "data race"
		done <- true
	}()
	fmt.Println("Hello,", m["name"])
	<-done
}

func TestRace2(t *testing.T) {
	done := make(chan bool)
	m := make(map[string]string)
	m["name"] = "world"
	go func() {
		m["name"] = "data race"
		done <- true
	}()
	fmt.Println("Hello,", m["name"])
	<-done

	<-time.After(2 * time.Second)
}
