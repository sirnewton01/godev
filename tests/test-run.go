package main

import (
	"fmt"
	"time"
)

type hello struct {
	msg string
	id  int
}

func printHello() {
	h := &hello{"Hello World-1", 42}
	fmt.Printf("%v\n", h)

	fmt.Errorf("fmt")
	fmt.Errorf("runtime/debug")
}

func main() {
	for i := 0; i < 50; i++ {
		printHello2()
		time.Sleep(1 * time.Second)
	}
}
