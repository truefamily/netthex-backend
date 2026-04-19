export const mockGroups = {
  'lagos-founders': {
    name: 'Lagos Founders Circle',
    slug: 'lagos-founders',
    description:
      'Un groupe pour les fondateurs, operateurs et builders qui lancent des produits ambitieux en Afrique de l Ouest.',
    adminId: 'mock-admin-1',
    adminName: 'Aisha Bello',
    createdAt: '2026-04-10T09:00:00.000Z',
    memberCount: 148,
    members: {
      'mock-admin-1': true,
      'mock-user-2': true,
      'mock-user-3': true,
    },
    posts: {
      post1: {
        authorId: 'mock-admin-1',
        authorName: 'Aisha Bello',
        content:
          'On organise un meetup produit jeudi soir a Victoria Island. Si vous bossez sur une fintech ou une app communautaire, venez partager vos retours terrain.',
        createdAt: '2026-04-16T18:15:00.000Z',
      },
      post2: {
        authorId: 'mock-user-2',
        authorName: 'Tunde Okafor',
        content:
          'Quelqu un ici a deja mesure un onboarding WhatsApp versus email sur les 7 premiers jours ? Je compare les taux d activation.',
        createdAt: '2026-04-15T10:30:00.000Z',
      },
    },
    messages: {
      msg1: {
        authorId: 'mock-user-3',
        authorName: 'Mariam S.',
        content: 'Je peux partager nos learnings sur les cohorts si vous voulez.',
        timestamp: '2026-04-16T19:10:00.000Z',
      },
    },
  },
  'design-lab': {
    name: 'Design Lab Africa',
    slug: 'design-lab',
    description:
      'Designers UI, UX writers et product thinkers qui veulent critiquer des interfaces et eleveur leurs standards.',
    adminId: 'mock-admin-2',
    adminName: 'Kemi Johnson',
    createdAt: '2026-04-08T12:30:00.000Z',
    memberCount: 96,
    members: {
      'mock-admin-2': true,
      'mock-user-4': true,
    },
    posts: {
      post1: {
        authorId: 'mock-admin-2',
        authorName: 'Kemi Johnson',
        content:
          'Je viens de poster trois variantes de page d accueil pour une app sociale. Dites moi laquelle convertit le mieux selon vous et pourquoi.',
        createdAt: '2026-04-17T08:20:00.000Z',
      },
      post2: {
        authorId: 'mock-user-4',
        authorName: 'Chisom Ada',
        content:
          'Petit rappel: on peut faire premium sans surcharger. Une bonne grille, une meilleure hierarchie, et des espaces bien tenus changent tout.',
        createdAt: '2026-04-16T09:40:00.000Z',
      },
    },
    messages: {
      msg1: {
        authorId: 'mock-user-4',
        authorName: 'Chisom Ada',
        content: 'Le contraste du CTA principal est excellent sur la version B.',
        timestamp: '2026-04-17T09:00:00.000Z',
      },
    },
  },
  'dev-hub': {
    name: 'React & Firebase Hub',
    slug: 'dev-hub',
    description:
      'Pour les devs qui construisent vite, iterent souvent et partagent snippets, patterns et debugs utiles.',
    adminId: 'mock-admin-3',
    adminName: 'David Mensah',
    createdAt: '2026-04-05T14:00:00.000Z',
    memberCount: 204,
    members: {
      'mock-admin-3': true,
      'mock-user-5': true,
      'mock-user-6': true,
    },
    posts: {
      post1: {
        authorId: 'mock-admin-3',
        authorName: 'David Mensah',
        content:
          'Astuce du jour: pour eviter une home vide, prevoyez toujours un fallback de contenu ou des donnees seed. L impression produit change completement.',
        createdAt: '2026-04-17T07:10:00.000Z',
      },
      post2: {
        authorId: 'mock-user-5',
        authorName: 'Nadia K.',
        content:
          'Je cherche une bonne strategie pour separer les hooks de context et regler les warnings react-refresh proprement.',
        createdAt: '2026-04-14T16:10:00.000Z',
      },
      post3: {
        authorId: 'mock-user-6',
        authorName: 'Ifeanyi Eze',
        content:
          'Quelqu un a deja structure un feed style Instagram avec des groupes comme source de contenu ?',
        createdAt: '2026-04-13T11:45:00.000Z',
      },
    },
    messages: {
      msg1: {
        authorId: 'mock-user-5',
        authorName: 'Nadia K.',
        content: 'Je peux ouvrir un repo exemple si besoin.',
        timestamp: '2026-04-17T07:45:00.000Z',
      },
      msg2: {
        authorId: 'mock-admin-3',
        authorName: 'David Mensah',
        content: 'Oui, partage le lien dans le channel ressources.',
        timestamp: '2026-04-17T08:00:00.000Z',
      },
    },
  },
  'creators-club': {
    name: 'Creators Club',
    slug: 'creators-club',
    description:
      'Un espace pour les createurs de contenu, video editors et community builders qui veulent mieux raconter leurs projets.',
    adminId: 'mock-admin-4',
    adminName: 'Stephanie U.',
    createdAt: '2026-04-03T16:45:00.000Z',
    memberCount: 73,
    members: {
      'mock-admin-4': true,
      'mock-user-7': true,
    },
    posts: {
      post1: {
        authorId: 'mock-admin-4',
        authorName: 'Stephanie U.',
        content:
          'Challenge de la semaine: raconte ton produit en une phrase, puis transforme cette phrase en reel de 20 secondes.',
        createdAt: '2026-04-16T13:55:00.000Z',
      },
    },
    messages: {},
  },
}
