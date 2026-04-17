import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import ConfigSetCard from '../components/ConfigSetCard'
import NewConfigSetModal from '../components/NewConfigSetModal'
export default function Dashboard() {
  const [newOpen, setNewOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['config-sets'],
    queryFn: api.listConfigSets,
  })

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Config Sets</Heading>
        <Button colorPalette="blue" onClick={() => setNewOpen(true)}>
          + New Config Set
        </Button>
      </Flex>

      {isLoading && (
        <Flex justify="center" py={12}>
          <Spinner size="xl" />
        </Flex>
      )}

      {error && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Title>Failed to load config sets</Alert.Title>
          <Alert.Description>{(error as Error).message}</Alert.Description>
        </Alert.Root>
      )}

      {data && data.length === 0 && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          borderRadius="lg"
          borderWidth="2px"
          borderStyle="dashed"
          borderColor="gray.200"
          _dark={{ borderColor: 'gray.600' }}
        >
          <Text color="gray.500" mb={4}>No config sets found</Text>
          <Button colorPalette="blue" onClick={() => setNewOpen(true)}>
            Create your first config set
          </Button>
        </Flex>
      )}

      {data && data.length > 0 && (
        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
          gap={4}
          alignItems="start"
        >
          {data.map((set) => (
            <ConfigSetCard key={set.name} set={set} />
          ))}
        </Grid>
      )}

      <NewConfigSetModal open={newOpen} onClose={() => setNewOpen(false)} />
    </Box>
  )
}
