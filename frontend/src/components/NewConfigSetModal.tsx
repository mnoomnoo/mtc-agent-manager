import { useState } from 'react'
import {
  Button,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
  Input,
  Text,
} from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { toaster } from '../toaster'

interface Props {
  open: boolean
  onClose: () => void
}

export default function NewConfigSetModal({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => api.createConfigSet(name.trim()),
    onSuccess: () => {
      toaster.create({ title: `Created '${name.trim()}'`, type: 'success' })
      qc.invalidateQueries({ queryKey: ['config-sets'] })
      setName('')
      onClose()
    },
    onError: (err: Error) => {
      toaster.create({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const handleSubmit = () => {
    if (name.trim()) mutation.mutate()
  }

  return (
    <DialogRoot open={open} onOpenChange={(e) => { if (!e.open) { setName(''); onClose() } }}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Config Set</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <Text mb={2} fontSize="sm" color="gray.600">Name for the new config set directory</Text>
          <Input
            placeholder="e.g. production-line-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            colorPalette="blue"
            loading={mutation.isPending}
            disabled={!name.trim()}
            onClick={handleSubmit}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  )
}
