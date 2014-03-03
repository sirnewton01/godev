// COPYRIGHT

// GODOC
package main

import "fmt"

// Verify the bracket highlighting for the main2 function block
func main2() {
	// Verify that the brackets do not highlight within the string
	fmt.Printf("Hello()")
	
	// Verify that the brackets do not hightlight (within this comment)
	
	// Verify the bracket highlighting in here and the multi-line string is working ok
	h := &hello2{`Hello World // comment 7
	again and again plus an import`, 42} // comment 6
	h.ab() 
}
