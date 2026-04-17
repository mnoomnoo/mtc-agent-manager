import { useState, useEffect, useSyncExternalStore } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { api } from '../api'
import { toaster } from '../toaster'

const FILE_LABELS: Record<string, string> = {
  'docker-compose.yml': 'docker-compose.yml',
  '.env': '.env',
  'volumes/agent/agent.json': 'agent.json',
  'volumes/agent/devices.xml': 'devices.xml',
  'volumes/mosquitto/config/mosquitto.conf': 'mosquitto.conf',
}

function getExtensions(filePath: string) {
  if (filePath.endsWith('.json')) return [json()]
  if (filePath.endsWith('.xml')) return [xml()]
  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return [StreamLanguage.define(yaml)]
  return []
}

export default function EditorPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isDark = useSyncExternalStore(
    (cb) => { const mq = window.matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb) },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const colorMode = isDark ? 'dark' : 'light'
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const decodedName = decodeURIComponent(name ?? '')

  const { data: filesData } = useQuery({
    queryKey: ['files', decodedName],
    queryFn: () => api.listFiles(decodedName),
    enabled: !!decodedName,
  })

  const { data: statusData } = useQuery({
    queryKey: ['status', decodedName],
    queryFn: () => api.getStatus(decodedName),
    enabled: !!decodedName,
    refetchInterval: 10_000,
  })

  const { data: fileData, isLoading: fileLoading } = useQuery({
    queryKey: ['file-content', decodedName, selectedFile],
    queryFn: () => api.readFile(decodedName, selectedFile!),
    enabled: !!selectedFile,
  })

  useEffect(() => {
    if (fileData) {
      setEditorContent(fileData.content)
      setIsDirty(false)
    }
  }, [fileData])

  useEffect(() => {
    if (filesData?.files.length && !selectedFile) {
      setSelectedFile(filesData.files[0])
    }
  }, [filesData])

  const saveMutation = useMutation({
    mutationFn: () => api.writeFile(decodedName, selectedFile!, editorContent),
    onSuccess: () => {
      toaster.create({ title: 'Saved', type: 'success' })
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['file-content', decodedName, selectedFile] })
    },
    onError: (err: Error) => {
      toaster.create({ title: 'Save failed', description: err.message, type: 'error' })
    },
  })

  const upMutation = useMutation({
    mutationFn: () => api.composeUp(decodedName),
    onSuccess: (r) => {
      toaster.create({ title: r.success ? 'Started' : 'Up had errors', type: r.success ? 'success' : 'warning' })
      qc.invalidateQueries({ queryKey: ['status', decodedName] })
      qc.invalidateQueries({ queryKey: ['config-sets'] })
    },
    onError: (err: Error) => toaster.create({ title: 'Error', description: err.message, type: 'error' }),
  })

  const downMutation = useMutation({
    mutationFn: () => api.composeDown(decodedName),
    onSuccess: (r) => {
      toaster.create({ title: r.success ? 'Stopped' : 'Down had errors', type: r.success ? 'success' : 'warning' })
      qc.invalidateQueries({ queryKey: ['status', decodedName] })
      qc.invalidateQueries({ queryKey: ['config-sets'] })
    },
    onError: (err: Error) => toaster.create({ title: 'Error', description: err.message, type: 'error' }),
  })

  return (
    <Box>
      <Flex align="center" gap={3} mb={4} wrap="wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Back
        </Button>
        <Heading size="md">{decodedName}</Heading>
        {statusData && (
          <Badge colorPalette={statusData.running ? 'green' : 'gray'}>
            {statusData.running ? 'Running' : 'Stopped'}
          </Badge>
        )}
        <HStack ml="auto" gap={2}>
          <Button
            size="sm"
            colorPalette="green"
            loading={upMutation.isPending}
            disabled={statusData?.running}
            onClick={() => upMutation.mutate()}
          >
            Start
          </Button>
          <Button
            size="sm"
            colorPalette="orange"
            loading={downMutation.isPending}
            disabled={!statusData?.running}
            onClick={() => downMutation.mutate()}
          >
            Stop
          </Button>
        </HStack>
      </Flex>

      <Flex gap={4} align="flex-start">
        <Box
          w="200px"
          flexShrink={0}
          bg="white"
          _dark={{ bg: 'gray.800' }}
          borderRadius="lg"
          borderWidth="1px"
          p={2}
        >
          {filesData?.files.map((f) => (
            <Box
              key={f}
              px={3}
              py={2}
              borderRadius="md"
              cursor="pointer"
              fontSize="sm"
              fontFamily="mono"
              bg={selectedFile === f ? 'blue.50' : 'transparent'}
              color={selectedFile === f ? 'blue.600' : 'inherit'}
              _dark={{
                bg: selectedFile === f ? 'blue.900' : 'transparent',
                color: selectedFile === f ? 'blue.300' : 'inherit',
              }}
              _hover={{ bg: selectedFile === f ? undefined : 'gray.50', _dark: { bg: 'gray.700' } }}
              onClick={() => {
                if (isDirty && !window.confirm('You have unsaved changes. Switch anyway?')) return
                setSelectedFile(f)
              }}
            >
              {FILE_LABELS[f] ?? f}
            </Box>
          ))}
        </Box>

        <Box flex={1} minW={0} textAlign="left">
          {!selectedFile && (
            <Alert.Root status="info" borderRadius="md">
              <Alert.Indicator />
              <Alert.Title>Select a file to edit</Alert.Title>
            </Alert.Root>
          )}

          {selectedFile && (
            <Box
              bg="white"
              _dark={{ bg: 'gray.800' }}
              borderRadius="lg"
              borderWidth="1px"
              overflow="hidden"
            >
              <Flex
                px={4}
                py={2}
                borderBottomWidth="1px"
                align="center"
                justify="space-between"
                bg="gray.50"
                _dark={{ bg: 'gray.700' }}
              >
                <Text fontSize="sm" fontFamily="mono" color="gray.600">
                  {selectedFile}
                  {isDirty && <Text as="span" color="orange.400"> •</Text>}
                </Text>
                <Button
                  size="sm"
                  colorPalette="blue"
                  loading={saveMutation.isPending}
                  disabled={!isDirty}
                  onClick={() => saveMutation.mutate()}
                >
                  Save
                </Button>
              </Flex>

              {fileLoading ? (
                <Flex justify="center" py={8}><Spinner /></Flex>
              ) : (
                <CodeMirror
                  value={editorContent}
                  height="calc(100vh - 280px)"
                  theme={colorMode}
                  extensions={getExtensions(selectedFile)}
                  onChange={(val) => {
                    setEditorContent(val)
                    setIsDirty(true)
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  )
}
