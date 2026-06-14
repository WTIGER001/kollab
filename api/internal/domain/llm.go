package domain

import "context"

type LLMClient interface {
	GenerateText(ctx context.Context, prompt string) (string, error)
	GenerateTextEmbeddings(ctx context.Context, text string) ([]float32, error)
}
