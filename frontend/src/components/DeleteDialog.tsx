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
  name: string
  open: boolean
  onClose: () => void
}

export default function DeleteDialog({ name, open, onClose }: Props) {
  const [confirm, setConfirm] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => api.deleteConfigSet(name),
    onSuccess: () => {
      toaster.create({ title: `Deleted '${name}'`, type: 'success' })
      qc.invalidateQueries({ queryKey: ['config-sets'] })
      setConfirm('')
      onClose()
    },
    onError: (err: Error) => {
      toaster.create({ title: 'Delete failed', description: err.message, type: 'error' })
    },
  })

  return (
    <DialogRoot open={open} onOpenChange={(e) => { if (!e.open) { setConfirm(''); onClose() } }}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
      <DialogContent>
        <DialogHeader>
          <DialogTitle color="red.500">Delete Config Set</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <Text mb={3}>
            This will permanently delete <strong>{name}</strong> and all its files. This cannot be undone.
          </Text>
          <Text mb={2} fontSize="sm" color="gray.600">
            Type <strong>{name}</strong> to confirm:
          </Text>
          <Input
            placeholder={name}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoFocus
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            colorPalette="red"
            loading={mutation.isPending}
            disabled={confirm !== name}
            onClick={() => mutation.mutate()}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  )
}
