const isOpen = ref(false)

export function useDonationModal() {
    const { gtag } = useGtag()

    function open() {
        isOpen.value = true
        gtag('event', 'donation_modal_open', {
            event_category: 'donation',
            event_label: 'modal_open',
        })
    }

    function close() {
        isOpen.value = false
    }

    return { isOpen, open, close }
}
