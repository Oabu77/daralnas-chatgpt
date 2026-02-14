package main

import (
	"os"

	"github.com/QuranChain/quranchain/cmd/qurand/cmd"
)

func main() {
	rootCmd := cmd.NewRootCmd()
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
