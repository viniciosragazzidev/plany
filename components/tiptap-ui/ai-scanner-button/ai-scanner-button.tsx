"use client"

import { forwardRef, useCallback, useRef, useState } from "react"
import { ScanEye } from "lucide-react"
import { toast } from "sonner"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Server Actions ---
import { ocrAction } from "@/lib/actions/ocr"

// --- UI Primitives ---
import { Button, type ButtonProps } from "@/components/tiptap-ui-primitive/button"

export interface AiScannerButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * The editor instance.
   */
  editor?: Editor
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for AI Image Scanner (OCR) in a Tiptap editor.
 * Uses Gemini 2.5 Flash to extract text from images and insert it as Markdown.
 */
export const AiScannerButton = forwardRef<
  HTMLButtonElement,
  AiScannerButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isScanning, setIsScanning] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleScan = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !editor) return

        setIsScanning(true)
        const toastId = toast.loading("PLANY extraindo textos da imagem... 🔍")

        try {
          const formData = new FormData()
          formData.append("file", file)

          const result = await ocrAction(formData)

          if (result.success) {
            try {
              // Conforme documentação oficial: Usando o MarkdownManager via editor.markdown
              // @ts-expect-error - editor.markdown é injetado pela extensão mas não está no tipo base
              const markdownManager = editor.markdown
              
              if (markdownManager?.parse) {
                // Parseia o Markdown bruto diretamente para JSON interno (ProseMirror)
                const jsonContent = markdownManager.parse(result.data)

                editor.chain()
                  .focus()
                  .setTextSelection(editor.state.doc.content.size)
                  .insertContent("\n\n") // Garante separação de blocos
                  .insertContent(jsonContent.content) // Insere apenas o array de conteúdo do objeto 'doc'
                  .run()
              } else {
                // Fallback: Inserção com contentType (método secundário oficial)
                editor.chain()
                  .focus()
                  .setTextSelection(editor.state.doc.content.size)
                  .insertContent(`\n\n${result.data}`, { contentType: 'markdown' })
                  .run()
              }
              
              toast.success("Texto da imagem adicionado ao seu caderno!", {
                id: toastId,
              })
            } catch (insertionError) {
              console.error("Erro na inserção via MarkdownManager:", insertionError)
              // Fallback final de segurança
              editor.commands.insertContent(`\n\n${result.data}\n`)
              toast.success("Texto adicionado (formatação bruta preservada).", {
                id: toastId,
              })
            }
          } else {
            toast.error(result.message, { id: toastId })
          }
        } catch (error) {
          console.error("Erro no Scanner:", error)
          toast.error("Putz, deu um erro aqui. Consegue tentar de novo?", { id: toastId })
        } finally {
          setIsScanning(false)
          // Reset input
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
      },
      [editor]
    )

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        fileInputRef.current?.click()
      },
      [onClick]
    )

    return (
      <>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleScan}
        />
        <Button
          type="button"
          variant="ghost"
          disabled={isScanning || !editor}
          tooltip="Scanner Inteligente (IA)"
          onClick={handleClick}
          {...buttonProps}
          ref={ref}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          {children ?? (
            <>
              <ScanEye className="tiptap-button-icon" />
              {text && <span className="tiptap-button-text">{text}</span>}
            </>
          )}
        </Button>
      </>
    )
  }
)

AiScannerButton.displayName = "AiScannerButton"
