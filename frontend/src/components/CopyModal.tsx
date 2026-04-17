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
  sourceName: string
  open: boolean
  onClose: () => void
}

export default function CopyModal({ sourceName, open, onClose }: Props) {
  const [newName, setNewName] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => api.copyConfigSet(sourceName, newName.trim()),
    onSuccess: () => {
      toaster.create({ title: `Copied to '${newName.trim()}'`, type: 'success' })
      qc.invalidateQueries({ queryKey: ['config-sets'] })
      setNewName('')
      onClose()
    },
    onError: (err: Error) => {
      toaster.create({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const handleSubmit = () => {
    if (newName.trim()) mutation.mutate()
  }

  return (
    <DialogRoot open={open} onOpenChange={(e) => { if (!e.open) { setNewName(''); onClose() } }}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Config Set</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <Text mb={2} fontSize="sm" color="gray.600">
            Copy <strong>{sourceName}</strong> to a new config set
          </Text>
          <Input
            placeholder="New config set name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            colorPalette="teal"
            loading={mutation.isPending}
            disabled={!newName.trim()}
            onClick={handleSubmit}
          >
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  )
}
