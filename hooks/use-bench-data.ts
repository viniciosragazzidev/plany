'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBenchSubjects, getBenchEditalItems, getBenchMaterials } from '@/lib/actions/fetch-bench'
import { 
  createSubject, 
  deleteSubject as deleteSubjectAction, 
  createTopic, 
  deleteTopic as deleteTopicAction,
  toggleTopicCompletion as toggleTopicAction, 
  addMaterial as addMaterialAction, 
  deleteMaterial as deleteMaterialAction,
  togglePinMaterial as togglePinAction
} from '@/lib/actions/bench'
import { toast } from 'sonner'

export function useBenchData(benchId: string) {
  const queryClient = useQueryClient()

  // Queries
  const subjectsQuery = useQuery({
    queryKey: ['bench-subjects', benchId],
    queryFn: () => getBenchSubjects(benchId),
  })

  const editalItemsQuery = useQuery({
    queryKey: ['bench-edital-items', benchId],
    queryFn: () => getBenchEditalItems(benchId),
  })

  const materialsQuery = useQuery({
    queryKey: ['bench-materials', benchId],
    queryFn: () => getBenchMaterials(benchId),
  })

  // Mutations with Optimistic Updates
  const addSubjectMutation = useMutation({
    mutationFn: (data: { title: string; colorTag: string }) => createSubject({ benchId, ...data }),
    onMutate: async (newSubject) => {
      await queryClient.cancelQueries({ queryKey: ['bench-subjects', benchId] })
      const previousSubjects = queryClient.getQueryData(['bench-subjects', benchId])
      queryClient.setQueryData(['bench-subjects', benchId], (old: any) => [
        ...(old || []),
        { id: 'temp-' + Date.now(), ...newSubject, priority: 3, createdAt: new Date(), isOptimistic: true }
      ])
      return { previousSubjects }
    },
    onError: (err, newSubject, context) => {
      queryClient.setQueryData(['bench-subjects', benchId], context?.previousSubjects)
      toast.error('Ops, deu um soluço na rede! Tentei salvar a matéria, mas não foi. Tenta de novo?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-subjects', benchId] })
    }
  })

  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId: string) => deleteSubjectAction(subjectId),
    onMutate: async (subjectId) => {
      await queryClient.cancelQueries({ queryKey: ['bench-subjects', benchId] })
      const previousSubjects = queryClient.getQueryData(['bench-subjects', benchId])
      queryClient.setQueryData(['bench-subjects', benchId], (old: any) => 
        old?.filter((s: any) => s.id !== subjectId)
      )
      return { previousSubjects }
    },
    onError: (err, subjectId, context) => {
      queryClient.setQueryData(['bench-subjects', benchId], context?.previousSubjects)
      toast.error('Vish! Não consegui apagar a matéria. Probleminha na conexão, tenta de novo?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-subjects', benchId] })
    }
  })

  const toggleTopicMutation = useMutation({
    mutationFn: ({ itemId, isCovered }: { itemId: string; isCovered: boolean }) => toggleTopicAction(itemId, isCovered),
    onMutate: async ({ itemId, isCovered }) => {
      await queryClient.cancelQueries({ queryKey: ['bench-edital-items', benchId] })
      const previousItems = queryClient.getQueryData(['bench-edital-items', benchId])
      queryClient.setQueryData(['bench-edital-items', benchId], (old: any) => 
        old?.map((item: any) => item.id === itemId ? { ...item, isCovered } : item)
      )
      return { previousItems }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['bench-edital-items', benchId], context?.previousItems)
      toast.error('Eita! O status do tópico não subiu. A rede deu uma piscada, tenta marcar de novo?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-edital-items', benchId] })
    }
  })

  const addMaterialMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await addMaterialAction(formData);
      if (!res.success) {
        throw new Error(res.message || res.error || 'Erro ao adicionar material');
      }
      return res.data;
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: ['bench-materials', benchId] })
      const previousMaterials = queryClient.getQueryData(['bench-materials', benchId])
      
      const newMaterial = {
        id: 'temp-' + Date.now(),
        title: formData.get('title') as string,
        type: formData.get('type') as string,
        subjectId: formData.get('subjectId') as string,
        editalItemId: formData.get('editalItemId') as string,
        isPinned: formData.get('isPinned') === 'true',
        createdAt: new Date(),
        isOptimistic: true
      }

      queryClient.setQueryData(['bench-materials', benchId], (old: any) => [
        ...(old || []),
        newMaterial
      ])

      return { previousMaterials }
    },
    onError: (err: any, variables, context) => {
      queryClient.setQueryData(['bench-materials', benchId], context?.previousMaterials)
      toast.error(err.message || 'Ops! O material se perdeu no caminho. A rede falhou, tenta subir ele de novo?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-materials', benchId] })
    }
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: string) => deleteMaterialAction(materialId),
    onMutate: async (materialId) => {
      await queryClient.cancelQueries({ queryKey: ['bench-materials', benchId] })
      const previousMaterials = queryClient.getQueryData(['bench-materials', benchId])
      queryClient.setQueryData(['bench-materials', benchId], (old: any) => 
        old?.filter((m: any) => m.id !== materialId)
      )
      return { previousMaterials }
    },
    onError: (err, materialId, context) => {
      queryClient.setQueryData(['bench-materials', benchId], context?.previousMaterials)
      toast.error('Houve um soluço! Não consegui remover o material. Tenta mais uma vez?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-materials', benchId] })
    }
  })

  const togglePinMutation = useMutation({
    mutationFn: ({ materialId, isPinned }: { materialId: string; isPinned: boolean }) => togglePinAction(materialId, isPinned),
    onMutate: async ({ materialId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: ['bench-materials', benchId] })
      const previousMaterials = queryClient.getQueryData(['bench-materials', benchId])
      queryClient.setQueryData(['bench-materials', benchId], (old: any) => 
        old?.map((m: any) => m.id === materialId ? { ...m, isPinned } : m)
      )
      return { previousMaterials }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['bench-materials', benchId], context?.previousMaterials)
      toast.error('Quase lá! O alfinete não prendeu. Tenta fixar de novo?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-materials', benchId] })
    }
  })

  const addTopicMutation = useMutation({
    mutationFn: (data: { category: string; topic: string }) => createTopic({ benchId, ...data }),
    onMutate: async (newTopic) => {
      await queryClient.cancelQueries({ queryKey: ['bench-edital-items', benchId] })
      const previousItems = queryClient.getQueryData(['bench-edital-items', benchId])
      queryClient.setQueryData(['bench-edital-items', benchId], (old: any) => [
        ...(old || []),
        { id: 'temp-' + Date.now(), ...newTopic, isCovered: false, isOptimistic: true }
      ])
      return { previousItems }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['bench-edital-items', benchId], context?.previousItems)
      toast.error('Opa! Não consegui criar esse assunto agora. Tenta de novo?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-edital-items', benchId] })
    }
  })

  const deleteTopicMutation = useMutation({
    mutationFn: (topicId: string) => deleteTopicAction(topicId),
    onMutate: async (topicId) => {
      await queryClient.cancelQueries({ queryKey: ['bench-edital-items', benchId] })
      const previousItems = queryClient.getQueryData(['bench-edital-items', benchId])
      queryClient.setQueryData(['bench-edital-items', benchId], (old: any) => 
        old?.filter((item: any) => item.id !== topicId)
      )
      return { previousItems }
    },
    onError: (err, topicId, context) => {
      queryClient.setQueryData(['bench-edital-items', benchId], context?.previousItems)
      toast.error('Ops! Não consegui excluir o assunto. Tenta de novo?')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bench-edital-items', benchId] })
    }
  })

  return {
    subjects: subjectsQuery.data || [],
    editalItems: editalItemsQuery.data || [],
    materials: materialsQuery.data || [],
    isLoading: subjectsQuery.isLoading || editalItemsQuery.isLoading || materialsQuery.isLoading,
    addSubject: addSubjectMutation.mutate,
    deleteSubject: deleteSubjectMutation.mutate,
    toggleTopic: toggleTopicMutation.mutate,
    addTopic: addTopicMutation.mutate,
    deleteTopic: deleteTopicMutation.mutate,
    addMaterial: addMaterialMutation.mutateAsync,
    deleteMaterial: deleteMaterialMutation.mutate,
    togglePin: togglePinMutation.mutate,
  }
}
