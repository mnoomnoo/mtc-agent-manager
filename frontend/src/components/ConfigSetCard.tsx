import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  Flex,
  Grid,
  HStack,
  Heading,
  Portal,
  Text,
  Textarea,
  Tooltip,
} from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { ConfigSetStatus } from '../api'
import CopyModal from './CopyModal'
import DeleteDialog from './DeleteDialog'
import MoveDialog from './MoveDialog'

interface Props {
  set: ConfigSetStatus
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  if (!label) return <>{children}</>
  return (
    <Tooltip.Root openDelay={300} closeDelay={100}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content maxW="300px" fontSize="xs" wordBreak="break-all">
            {label}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}

export default function ConfigSetCard({ set }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [copyOpen, setCopyOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [draftDesc, setDraftDesc] = useState('')

  const descMutation = useMutation({
    mutationFn: (description: string) => api.updateDescription(set.name, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-sets'] })
      setEditingDesc(false)
    },
  })

  return (
    <>
      <CardRoot
        borderWidth="1px"
        borderRadius="lg"
        bg="white"
        _dark={{ bg: 'gray.800' }}
        boxShadow={set.running ? 'md' : 'sm'}
        borderColor={set.running ? 'green.300' : 'gray.200'}
        _hover={{ boxShadow: 'lg' }}
        transition="box-shadow 0.15s"
      >
        <CardBody p={4}>
          <Flex justify="space-between" align="flex-start" mb={3}>
            <Heading size="sm" wordBreak="break-all">{set.name}</Heading>
            <Badge colorPalette={set.running ? 'green' : 'gray'} ml={2} flexShrink={0}>
              {set.running ? 'Running' : 'Stopped'}
            </Badge>
          </Flex>

          {editingDesc ? (
            <Box mb={3}>
              <Textarea
                size="sm"
                rows={3}
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                placeholder="Describe this config set…"
                autoFocus
              />
              <HStack mt={1} gap={2}>
                <Button
                  size="xs"
                  colorPalette="blue"
                  loading={descMutation.isPending}
                  onClick={() => descMutation.mutate(draftDesc)}
                >
                  Save
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setEditingDesc(false)}>
                  Cancel
                </Button>
              </HStack>
            </Box>
          ) : (
            <Flex align="baseline" mb={3} gap={2}>
              <Text
                fontSize="xs"
                color={set.description ? 'gray.600' : 'gray.400'}
                _dark={{ color: set.description ? 'gray.300' : 'gray.500' }}
                flexGrow={1}
                fontStyle={set.description ? 'normal' : 'italic'}
              >
                {set.description || 'Add a description…'}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                color="gray.400"
                flexShrink={0}
                onClick={() => { setDraftDesc(set.description ?? ''); setEditingDesc(true) }}
              >
                Edit
              </Button>
            </Flex>
          )}

          {set.services.length > 0 && (
            <Box mb={3}>
              <Text fontSize="xs" color="gray.500" mb={1}>Services</Text>
              <HStack wrap="wrap" gap={1}>
                {set.services.map((s) => (
                  <Badge key={s} size="sm" variant="outline" colorPalette="blue">{s}</Badge>
                ))}
              </HStack>
            </Box>
          )}

          <Tip label={set.path}>
            <Text
              fontSize="xs"
              color="gray.400"
              mb={3}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              cursor="default"
            >
              {set.path}
            </Text>
          </Tip>

          <HStack wrap="wrap" gap={2}>
            <Button
              size="xs"
              colorPalette="blue"
              variant={set.running ? 'outline' : 'solid'}
              onClick={() => setMoveOpen(true)}
              disabled={set.running}
            >
              {set.running ? 'Active' : 'Switch To'}
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => navigate(`/config-sets/${encodeURIComponent(set.name)}`)}
            >
              Edit Files
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setCopyOpen(true)}>
              Copy
            </Button>
            <Button
              size="xs"
              colorPalette="red"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              disabled={set.running}
            >
              Delete
            </Button>
          </HStack>

          <Button
            size="xs"
            variant="ghost"
            width="full"
            mt={3}
            color="gray.500"
            _dark={{ color: 'gray.400' }}
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? 'Hide Details ▴' : 'Details ▾'}
          </Button>

          {showDetails && (
            <Box
              mt={2}
              pt={3}
              borderTopWidth="1px"
              borderColor="gray.200"
              _dark={{ borderColor: 'gray.700' }}
            >
              {set.containers.length === 0 ? (
                <Text fontSize="xs" color="gray.400">No containers</Text>
              ) : (
                <Box fontSize="xs">
                  <Grid templateColumns="1fr 2fr 1fr 1fr" gap={1} mb={1}>
                    <Text color="gray.500" fontWeight="semibold">Service</Text>
                    <Text color="gray.500" fontWeight="semibold">Image</Text>
                    <Text color="gray.500" fontWeight="semibold">State</Text>
                    <Text color="gray.500" fontWeight="semibold">Ports / Network</Text>
                  </Grid>
                  {set.containers.map((c) => {
                    const portsDisplay = c.ports || c.networks || '—'
                    const portsTooltip = c.ports
                      ? c.ports
                      : c.networks
                      ? `Network: ${c.networks}`
                      : ''
                    return (
                    <Grid key={c.name} templateColumns="1fr 2fr 1fr 1fr" gap={1} mb={1} alignItems="center">
                      <Tip label={c.service || c.name}>
                        <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" cursor="default">
                          {c.service || c.name}
                        </Text>
                      </Tip>
                      <Tip label={c.image}>
                        <Text
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          color="gray.600"
                          _dark={{ color: 'gray.300' }}
                          cursor="default"
                        >
                          {c.image || '—'}
                        </Text>
                      </Tip>
                      <Tip label={c.status}>
                        <Badge
                          size="sm"
                          colorPalette={c.state.toLowerCase() === 'running' ? 'green' : 'gray'}
                          cursor="default"
                        >
                          {c.state || '—'}
                        </Badge>
                      </Tip>
                      <Tip label={portsTooltip}>
                        <Text
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          color="gray.500"
                          cursor="default"
                        >
                          {portsDisplay}
                        </Text>
                      </Tip>
                    </Grid>
                    )
                  })}
                </Box>
              )}
            </Box>
          )}
        </CardBody>
      </CardRoot>

      <CopyModal sourceName={set.name} open={copyOpen} onClose={() => setCopyOpen(false)} />
      <DeleteDialog name={set.name} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <MoveDialog targetName={set.name} open={moveOpen} onClose={() => setMoveOpen(false)} />
    </>
  )
}
