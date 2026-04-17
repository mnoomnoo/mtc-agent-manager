import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Button,
  Code,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Portal,
  Flex,
  HStack,
  Heading,
  Input,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { toaster } from '../toaster'

type DialogStep = 'browse' | 'confirm'

export default function SettingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<DialogStep>('browse')
  const [browsePath, setBrowsePath] = useState('')
  const [inputPath, setInputPath] = useState('')
  const [newPath, setNewPath] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  })

  const { data: browseData, isFetching: browseFetching } = useQuery({
    queryKey: ['browse', browsePath],
    queryFn: () => api.browseDir(browsePath),
    enabled: dialogOpen && step === 'browse' && browsePath !== '',
  })

  function openDialog() {
    const start = settings?.configs_root ?? ''
    setBrowsePath(start)
    setInputPath(start)
    setStep('browse')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setNewPath('')
  }

  function navigateTo(path: string) {
    setBrowsePath(path)
    setInputPath(path)
  }

  function handleInputCommit() {
    if (inputPath.trim()) navigateTo(inputPath.trim())
  }

  useEffect(() => {
    if (browseData) setInputPath(browseData.path)
  }, [browseData])

  const selectedPath = browseData?.path ?? browsePath
  const isNewPathValid = selectedPath !== '' && selectedPath !== settings?.configs_root

  const saveMutation = useMutation({
    mutationFn: () => api.updateSettings({ configs_root: newPath }),
    onSuccess: () => {
      toaster.create({ title: 'Directory updated', type: 'success' })
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['config-sets'] })
      closeDialog()
    },
    onError: (err: Error) => toaster.create({ title: 'Error', description: err.message, type: 'error' }),
  })

  const moveMutation = useMutation({
    mutationFn: () => api.moveRoot(newPath),
    onSuccess: () => {
      toaster.create({ title: 'Directory moved', description: `Config sets moved to ${newPath}`, type: 'success' })
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['config-sets'] })
      closeDialog()
    },
    onError: (err: Error) => toaster.create({ title: 'Move failed', description: err.message, type: 'error' }),
  })

  const isPending = saveMutation.isPending || moveMutation.isPending

  if (isLoading) {
    return <Flex justify="center" py={12}><Spinner size="xl" /></Flex>
  }

  return (
    <Box maxW="600px">
      <Heading size="lg" mb={6}>Settings</Heading>

      <Box
        bg="white"
        _dark={{ bg: 'gray.800' }}
        borderRadius="lg"
        borderWidth="1px"
        p={6}
      >
        <Heading size="sm" mb={1}>Config Sets Root Directory</Heading>
        <Text fontSize="sm" color="gray.500" mb={3}>
          The directory where all config set subdirectories are stored.
        </Text>
        <Flex align="center" gap={3}>
          <Code fontSize="sm" flex={1} px={3} py={2} borderRadius="md" truncate>
            {settings?.configs_root ?? '—'}
          </Code>
          {settings?.locked ? (
            <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">Managed by environment</Text>
          ) : (
            <Button size="sm" variant="outline" colorPalette="blue" onClick={openDialog}>
              Change
            </Button>
          )}
        </Flex>
        <Text fontSize="xs" color="gray.400" mt={2}>
          {settings?.locked
            ? 'Set via CONFIGS_ROOT environment variable. Edit docker-compose.yml to change.'
            : 'Each subdirectory inside this path is treated as a config set.'}
        </Text>
      </Box>

      <DialogRoot open={dialogOpen} onOpenChange={(e) => { if (!e.open) closeDialog() }} size="lg">
        <Portal>
          <DialogBackdrop />
          <DialogPositioner>
        <DialogContent>
          {step === 'browse' ? (
            <>
              <DialogHeader>
                <DialogTitle>Select Directory</DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody pb={2}>
                <HStack mb={3} gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!browseData?.parent}
                    onClick={() => browseData?.parent && navigateTo(browseData.parent)}
                  >
                    ↑ Up
                  </Button>
                  <Input
                    ref={inputRef}
                    value={inputPath}
                    onChange={(e) => setInputPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInputCommit()}
                    onBlur={handleInputCommit}
                    fontFamily="mono"
                    fontSize="sm"
                    flex={1}
                  />
                </HStack>

                <Box
                  borderWidth="1px"
                  borderRadius="md"
                  overflow="hidden"
                  minH="240px"
                  maxH="320px"
                  overflowY="auto"
                  position="relative"
                >
                  {browseFetching && (
                    <Flex position="absolute" inset={0} justify="center" align="center" bg="blackAlpha.100" zIndex={10}>
                      <Spinner size="sm" />
                    </Flex>
                  )}
                  {!browseFetching && browseData?.dirs.length === 0 && (
                    <Flex justify="center" align="center" h="240px">
                      <Text fontSize="sm" color="gray.400">No subdirectories</Text>
                    </Flex>
                  )}
                  {browseData?.dirs.map((dir) => (
                    <Box
                      key={dir}
                      px={3}
                      py={2}
                      fontSize="sm"
                      fontFamily="mono"
                      cursor="pointer"
                      borderBottomWidth="1px"
                      _last={{ borderBottomWidth: 0 }}
                      _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}
                      onClick={() => navigateTo(`${browseData.path}/${dir}`)}
                    >
                      📁 {dir}
                    </Box>
                  ))}
                </Box>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  Click a folder to navigate into it, or type a path above.
                </Text>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
                <Button
                  colorPalette="blue"
                  disabled={!isNewPathValid}
                  onClick={() => { setNewPath(selectedPath); setStep('confirm') }}
                >
                  Select This Folder
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Move Existing Contents?</DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody>
                <Text fontSize="sm" mb={4}>
                  Would you like to move your existing config sets to the new location?
                </Text>
                <Box fontSize="sm" color="gray.500" mb={1}>From</Box>
                <Code fontSize="sm" display="block" px={3} py={2} borderRadius="md" mb={3} whiteSpace="pre-wrap">
                  {settings?.configs_root}
                </Code>
                <Box fontSize="sm" color="gray.500" mb={1}>To</Box>
                <Code fontSize="sm" display="block" px={3} py={2} borderRadius="md" whiteSpace="pre-wrap">
                  {newPath}
                </Code>
              </DialogBody>
              <DialogFooter>
                <HStack gap={2} w="full" justify="space-between">
                  <Button variant="ghost" onClick={() => setStep('browse')}>Back</Button>
                  <HStack gap={2}>
                    <Button
                      variant="outline"
                      loading={saveMutation.isPending}
                      disabled={isPending}
                      onClick={() => saveMutation.mutate()}
                    >
                      No, just update path
                    </Button>
                    <Button
                      colorPalette="blue"
                      loading={moveMutation.isPending}
                      disabled={isPending}
                      onClick={() => moveMutation.mutate()}
                    >
                      Yes, move contents
                    </Button>
                  </HStack>
                </HStack>
              </DialogFooter>
            </>
          )}
        </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>
    </Box>
  )
}
