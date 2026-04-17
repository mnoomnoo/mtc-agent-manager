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
  Text,
  Box,
} from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { toaster } from '../toaster'

interface Props {
  targetName: string
  open: boolean
  onClose: () => void
}

export default function MoveDialog({ targetName, open, onClose }: Props) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => api.move(targetName),
    onSuccess: (result) => {
      if (result.success) {
        toaster.create({ title: `Switched to '${targetName}'`, type: 'success' })
      } else {
        toaster.create({ title: 'Switch completed with warnings', description: result.stderr.slice(0, 200), type: 'warning' })
      }
      qc.invalidateQueries({ queryKey: ['config-sets'] })
      onClose()
    },
    onError: (err: Error) => {
      toaster.create({ title: 'Switch failed', description: err.message, type: 'error' })
    },
  })

  return (
    <DialogRoot open={open} onOpenChange={(e) => { if (!e.open) onClose() }}>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch to {targetName}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <Text mb={2}>
            Switching will stop any currently running config set and start <strong>{targetName}</strong>. This may take a moment.
          </Text>
          {mutation.data && (
            <Box
              mt={3}
              p={3}
              bg="gray.100"
              _dark={{ bg: 'gray.700' }}
              borderRadius="md"
              fontSize="xs"
              fontFamily="mono"
              whiteSpace="pre-wrap"
              maxH="200px"
              overflowY="auto"
            >
              {mutation.data.stdout}
              {mutation.data.stderr && <Text color="red.400">{mutation.data.stderr}</Text>}
            </Box>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button
            colorPalette="blue"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Switch
          </Button>
        </DialogFooter>
      </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  )
}
