// This file is a set of tests for the Go syntax highlighter.
// Run through the test cases described in the comments

// 1) Verify that the keywords are highlighted clearly (package, import, const, var)
package main

// 2) Verify that the import is highlighted correctly. Also, the strings should
//     have a blue highlight.
import (
	"fmt"
	"runtime/debug"
	"time"
	"net/http/cgi"
)

// 3) The following TODO should have a marker
// TODO

// Some day the following hyperlink should be ctrl-clickable to open up the search engine.
// http://www.google.com

// 4) The following two comments should be green.
// Comment 1
// Comment 2

// 5) The const should be highlighted. Also, the string value for checkCars should
//      be blue and not bleed into the rest of the text.
const(
    a = 5
    checkCars = `.:/\`
)

// 6) The type is highlighted. The struct is highlighted in a gentler colour.
//     Also, the types (string, int) should be highlighted in the gentle colour.
type hello2 struct {
	msg string
	id  int
}

// 7) Func is highlighted but nothing else in the signature is
func (h *hello2) ab() {
}

// 8) The type and interface should be highlighted but nothing else.
type bc interface {
	ab()
}

// 9) Ideally, the function name doesn't get highlighted like the primitive
//     type but this is ok because it is probably bad practice to name your
//     private methods like this.
func (h *hello2) uint64() {
// 10) The string here should be highlighted
	fmt.Printf("hello2 64-bits!\n")
}

// 10) Func, the byte, int and error types should all be highlighted.
func (b *hello2) Read(p []byte) (n int, err error) {
// 11) The return and nil are highlighted in different ways.
	return 0, nil
}

// 12) The func, byte, int and error should be highlighted.
func (b *hello2) Read2(p []byte) (int, error) {
	return 0, nil
}

// 13) Pointer type (ie. *int) should be highlighted but not the actual '*'
func (b *hello2) Read3(p []byte) (*int, error) {
	foo := 0
	return &foo, nil
}

// 14) Interface{} type should be highlighted (not the {} part though)
func (b *hello2) Read4(p []byte) interface{} {
	return nil
}

func printHello2() {
// 15) This multi-line string should be highlighted
//  The comment 7 should be highlighted as a string. 
//  Also, make sure there is no bleed-through
	h := &hello2{`Hello World // comment 7
	again and again plus an import`, 42} // comment 6
	h.ab()
// 16) The unit64 method call here should not be highlighted
	h.uint64()
	
// 17) The []byte type here should be highlighted (not the [] part though).
	bytes := []byte{1,2,3}

// 18) Built-in functions such as len and append have a special higlight.
	byteCount := len(bytes)
	bytes = append(bytes, 4)
	
// 19) var, string and the literal run should be highlighted. But not "nilfoo"
	var nilfoo string = string('f')
	nilfoo=string(bytes)
	
// 20) The string, uint64 converters should be highlighted. The strings with the
//      escapes should not bleed through and should be highlighted.
	fmt.Printf(string('f'))
	fmt.Printf(string('\''))
	fmt.Printf("%v\n", h)
	fmt.Printf(nilfoo)
	fmt.Printf("%d\n", uint64(32)+uint64(64))
	fmt.Printf("%d\n", byteCount)

	debug.PrintStack()

// 21) The adding of the strings should highlight only the string portions. The
//       string containing the len() in it should not have a built-in function
//       highlight.
	fmt.Errorf("" + nilfoo+" len(kdljlkjflkjlsjf)" + nilfoo + "123")
	fmt.Errorf("runtime/debug")
}


// 22) Multi-line comments with inner function calls, single line comments
//      etc. should have the comment colour.
/*func printHello() {
	h := &hello{`Hello World // comment 7   /*
	again and again plus an import`, 42} // comment 6
	h.ab()
	
	fmt.Printf(string('f'))
	fmt.Printf("%v\n", h)

	debug.PrintStack()

	fmt.Errorf("fmt \" "+" kdljlkjflkjlsjf")
	fmt.Errorf("runtime/debug")
}*/

func foo() {
	for i := 0; i < 2; i++ {
		printHello()
		time.Sleep(1 * time.Second)
	}
	
// 23) Map highlighting with the types, also the make built-in function.
	var bar map[string]string
	bar = make(map [string]string)
	bar["foo"] = "bar"
	
// 24) Making channels and sending data through them
	c := make(chan int)
	c <- 50
	
	err := cgi.Serve(nil)
	if err != nil {
		fmt.Printf("%v\n", err.Error())
	}
}
