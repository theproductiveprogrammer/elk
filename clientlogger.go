package main

import (
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) LogInfo(message string) {
	runtime.LogInfo(a.ctx, message)
}

func (a *App) LogWarning(message string) {
	runtime.LogWarning(a.ctx, message)
}

func (a *App) LogError(message string) {
	runtime.LogError(a.ctx, message)
}
