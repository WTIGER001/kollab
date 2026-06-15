package ai

import (
	"log"
	"os"

	"arkollab/api/internal/domain"
)

func NewLLMClient() domain.LLMClient {
	geminiKey := os.Getenv("GEMINI_API_KEY")
	if geminiKey == "" {
		geminiKey = os.Getenv("GEMINI_KEY")
	}
	if geminiKey != "" {
		log.Println("Initializing Gemini LLM Client...")
		return NewGeminiClient(geminiKey)
	}

	openaiKey := os.Getenv("OPENAI_API_KEY")
	if openaiKey == "" {
		openaiKey = os.Getenv("OPENAI_KEY")
	}
	if openaiKey != "" {
		log.Println("Initializing OpenAI LLM Client...")
		return NewOpenAIClient(openaiKey)
	}

	log.Println("Initializing local Ollama LLM Client...")
	return NewOllamaClient()
}
