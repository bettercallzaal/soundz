import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

if (!process.env.NEXT_PUBLIC_SUBGRAPH_URL) {
  throw new Error('NEXT_PUBLIC_SUBGRAPH_URL is not defined')
}

const httpLink = createHttpLink({
  uri: '/api/mock/auctions',
  credentials: 'same-origin'
})

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only'
    },
    query: {
      fetchPolicy: 'network-only'
    }
  }
})
