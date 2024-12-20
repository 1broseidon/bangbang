package main

import (
	"flag"
	"fmt"
	"log"
	"os"
)

func main() {
	dirPath := flag.String("dir", ".", "Directory path containing markdown files")
	flag.Parse()

	if _, err := os.Stat(*dirPath); os.IsNotExist(err) {
		log.Fatalf("Directory %s does not exist", *dirPath)
	}

	fmt.Printf("Starting bangbang with directory: %s\n", *dirPath)
}
